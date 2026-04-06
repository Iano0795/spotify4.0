import { AppError } from "@/lib/http/errors";
import { getServerEnv } from "@/lib/env";

const SPOTIFY_ACCOUNTS_URL = "https://accounts.spotify.com";

const SPOTIFY_SCOPES = [
  "user-read-email",
  "user-read-private",
  "playlist-modify-private",
  "playlist-modify-public",
];

export type SpotifyTokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
};

function getSpotifyAuthorizationHeader(): string {
  const { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET } = getServerEnv();
  const credentials = Buffer.from(
    `${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`,
    "utf8",
  ).toString("base64");

  return `Basic ${credentials}`;
}

async function requestSpotifyTokens(
  params: URLSearchParams,
): Promise<SpotifyTokenResponse> {
  const response = await fetch(`${SPOTIFY_ACCOUNTS_URL}/api/token`, {
    method: "POST",
    headers: {
      Authorization: getSpotifyAuthorizationHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new AppError(
      "SPOTIFY_AUTH_FAILED",
      502,
      `Spotify token exchange failed: ${body || response.statusText}`,
    );
  }

  return (await response.json()) as SpotifyTokenResponse;
}

export function buildSpotifyLoginUrl(state: string): string {
  const { SPOTIFY_CLIENT_ID, SPOTIFY_REDIRECT_URI } = getServerEnv();
  const url = new URL(`${SPOTIFY_ACCOUNTS_URL}/authorize`);

  url.searchParams.set("client_id", SPOTIFY_CLIENT_ID);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", SPOTIFY_REDIRECT_URI);
  url.searchParams.set("scope", SPOTIFY_SCOPES.join(" "));
  url.searchParams.set("state", state);
  url.searchParams.set("show_dialog", "true");

  return url.toString();
}

export async function exchangeCodeForTokens(
  code: string,
): Promise<SpotifyTokenResponse> {
  const { SPOTIFY_REDIRECT_URI } = getServerEnv();

  const params = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: SPOTIFY_REDIRECT_URI,
  });

  return requestSpotifyTokens(params);
}

export async function refreshAccessToken(
  refreshToken: string,
): Promise<SpotifyTokenResponse> {
  const params = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  return requestSpotifyTokens(params);
}
