import { randomBytes } from "node:crypto";

import type { SpotifyAccount, User } from "@prisma/client";
import { cookies } from "next/headers";

import { prisma } from "@/lib/db/prisma";
import { getServerEnv } from "@/lib/env";
import { AppError } from "@/lib/http/errors";
import { decryptString, encryptString } from "@/lib/security/crypto";

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;
const OAUTH_STATE_COOKIE = "spotify4_oauth_state";
const OAUTH_STATE_TTL_MS = 1000 * 60 * 10;

export type AuthenticatedUser = User & {
  spotifyAccount: SpotifyAccount | null;
};

type SpotifyProfileInput = {
  spotifyUserId: string;
  email: string | null;
  displayName: string | null;
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date | null;
};

function getCookieSecurity() {
  return process.env.NODE_ENV === "production";
}

export function getSessionCookieName(): string {
  return getServerEnv().SESSION_COOKIE_NAME;
}

export async function setOAuthStateCookie(state: string): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: getCookieSecurity(),
    path: "/",
    expires: new Date(Date.now() + OAUTH_STATE_TTL_MS),
  });
}

export async function consumeOAuthStateCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(OAUTH_STATE_COOKIE)?.value ?? null;
  cookieStore.delete(OAUTH_STATE_COOKIE);
  return value;
}

export async function createSession(userId: string): Promise<{
  sessionId: string;
  expiresAt: Date;
}> {
  const sessionId = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await prisma.session.create({
    data: {
      id: sessionId,
      userId,
      expiresAt,
    },
  });

  return { sessionId, expiresAt };
}

export async function setSessionCookie(
  sessionId: string,
  expiresAt: Date,
): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(getSessionCookieName(), sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: getCookieSecurity(),
    path: "/",
    expires: expiresAt,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(getSessionCookieName());
}

export async function deleteCurrentSession(): Promise<void> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(getSessionCookieName())?.value;

  if (!sessionId) {
    await clearSessionCookie();
    return;
  }

  await prisma.session.deleteMany({
    where: {
      id: sessionId,
    },
  });

  await clearSessionCookie();
}

export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(getSessionCookieName())?.value;

  if (!sessionId) {
    return null;
  }

  const session = await prisma.session.findFirst({
    where: {
      id: sessionId,
      expiresAt: {
        gt: new Date(),
      },
    },
    include: {
      user: {
        include: {
          spotifyAccount: true,
        },
      },
    },
  });

  if (!session) {
    return null;
  }

  return session.user;
}

export async function requireCurrentUser(): Promise<AuthenticatedUser> {
  const user = await getCurrentUser();

  if (!user) {
    throw new AppError("UNAUTHORIZED", 401, "Authentication required.");
  }

  return user;
}

export async function requireSpotifyAccount(): Promise<
  AuthenticatedUser & { spotifyAccount: SpotifyAccount }
> {
  const user = await requireCurrentUser();

  if (!user.spotifyAccount) {
    throw new AppError(
      "SPOTIFY_NOT_CONNECTED",
      401,
      "Spotify account is not connected.",
    );
  }

  return {
    ...user,
    spotifyAccount: user.spotifyAccount,
  };
}

export async function upsertSpotifyAccount(
  input: SpotifyProfileInput,
): Promise<AuthenticatedUser> {
  const spotifyAccount = await prisma.spotifyAccount.findUnique({
    where: {
      spotifyUserId: input.spotifyUserId,
    },
    include: {
      user: true,
    },
  });

  const accessTokenEncrypted = encryptString(input.accessToken);
  const refreshTokenEncrypted = input.refreshToken
    ? encryptString(input.refreshToken)
    : null;

  if (spotifyAccount) {
    await prisma.user.update({
      where: { id: spotifyAccount.userId },
      data: {
        email: input.email ?? spotifyAccount.user.email,
        displayName: input.displayName ?? spotifyAccount.user.displayName,
      },
    });

    const updated = await prisma.spotifyAccount.update({
      where: { id: spotifyAccount.id },
      data: {
        accessTokenEncrypted,
        refreshTokenEncrypted:
          refreshTokenEncrypted ?? spotifyAccount.refreshTokenEncrypted,
        expiresAt: input.expiresAt,
      },
      include: {
        user: true,
      },
    });

    return {
      ...updated.user,
      spotifyAccount: updated,
    };
  }

  const user =
    input.email === null
      ? await prisma.user.create({
          data: {
            email: null,
            displayName: input.displayName,
          },
        })
      : await prisma.user.upsert({
          where: { email: input.email },
          update: {
            displayName: input.displayName,
          },
          create: {
            email: input.email,
            displayName: input.displayName,
          },
        });

  const createdAccount = await prisma.spotifyAccount.create({
    data: {
      userId: user.id,
      spotifyUserId: input.spotifyUserId,
      accessTokenEncrypted,
      refreshTokenEncrypted,
      expiresAt: input.expiresAt,
    },
  });

  return {
    ...user,
    spotifyAccount: createdAccount,
  };
}

export function decryptSpotifyTokens(account: SpotifyAccount): {
  accessToken: string | null;
  refreshToken: string | null;
} {
  return {
    accessToken: account.accessTokenEncrypted
      ? decryptString(account.accessTokenEncrypted)
      : null,
    refreshToken: account.refreshTokenEncrypted
      ? decryptString(account.refreshTokenEncrypted)
      : null,
  };
}
