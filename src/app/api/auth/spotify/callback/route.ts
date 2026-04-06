import { exchangeCodeForTokens } from "@/lib/spotify/auth";
import { toErrorResponse, AppError } from "@/lib/http/errors";
import { fetchSpotifyProfile } from "@/server/services/spotify.service";
import {
  consumeOAuthStateCookie,
  createSession,
  setSessionCookie,
  upsertSpotifyAccount,
} from "@/server/services/auth.service";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");

    if (!code) {
      throw new AppError("MISSING_CODE", 400, "Missing Spotify auth code.");
    }

    const expectedState = await consumeOAuthStateCookie();

    if (!state || !expectedState || state !== expectedState) {
      throw new AppError(
        "INVALID_OAUTH_STATE",
        400,
        "Spotify OAuth state validation failed.",
      );
    }

    const tokenResponse = await exchangeCodeForTokens(code);
    const spotifyProfile = await fetchSpotifyProfile(tokenResponse.access_token);
    const authenticatedUser = await upsertSpotifyAccount({
      spotifyUserId: spotifyProfile.id,
      email: spotifyProfile.email,
      displayName: spotifyProfile.display_name,
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token ?? null,
      expiresAt: new Date(Date.now() + tokenResponse.expires_in * 1000),
    });

    const session = await createSession(authenticatedUser.id);
    await setSessionCookie(session.sessionId, session.expiresAt);
  } catch (error) {
    return toErrorResponse(error);
  }

  return Response.redirect(new URL("/", request.url), 307);
}
