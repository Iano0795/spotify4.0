import { AppError } from "@/lib/http/errors";

const SPOTIFY_API_URL = "https://api.spotify.com/v1";

type SpotifyRequestOptions = {
  accessToken: string;
  method?: "GET" | "POST";
  body?: unknown;
  searchParams?: URLSearchParams;
};

export async function spotifyFetch<T>(
  path: string,
  options: SpotifyRequestOptions,
): Promise<T> {
  const url = new URL(`${SPOTIFY_API_URL}${path}`);

  if (options.searchParams) {
    url.search = options.searchParams.toString();
  }

  const response = await fetch(url, {
    method: options.method ?? "GET",
    headers: {
      Authorization: `Bearer ${options.accessToken}`,
      "Content-Type": "application/json",
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new AppError(
      "SPOTIFY_UPSTREAM_ERROR",
      502,
      `Spotify API request failed: ${body || response.statusText}`,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
