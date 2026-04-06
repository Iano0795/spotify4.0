import type { SpotifyAccount } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/http/errors";
import { refreshAccessToken } from "@/lib/spotify/auth";
import { spotifyFetch } from "@/lib/spotify/client";
import { encryptString } from "@/lib/security/crypto";
import { decryptSpotifyTokens, requireSpotifyAccount } from "@/server/services/auth.service";

type SpotifyProfile = {
  id: string;
  email: string | null;
  display_name: string | null;
};

type SpotifyTrack = {
  id: string;
  uri: string;
  name: string;
  artists: Array<{ name: string }>;
};

type SpotifySearchTracksResponse = {
  tracks: {
    items: SpotifyTrack[];
  };
};

type SpotifyAudioFeatures = {
  id: string;
  energy: number | null;
  valence: number | null;
  tempo: number | null;
  danceability: number | null;
  acousticness: number | null;
};

type SpotifyAudioFeaturesResponse = {
  audio_features: Array<SpotifyAudioFeatures | null>;
};

type SpotifyTracksResponse = {
  tracks: Array<SpotifyTrack | null>;
};

type SpotifyPlaylistResponse = {
  id: string;
  name: string;
};

function isSpotifyTrack(track: SpotifyTrack | null): track is SpotifyTrack {
  return track !== null;
}

function expiresSoon(expiresAt: Date | null): boolean {
  if (!expiresAt) {
    return true;
  }

  return expiresAt.getTime() <= Date.now() + 60_000;
}

async function refreshSpotifyAccount(account: SpotifyAccount): Promise<string> {
  const { refreshToken } = decryptSpotifyTokens(account);

  if (!refreshToken) {
    throw new AppError(
      "SPOTIFY_REAUTH_REQUIRED",
      401,
      "Spotify refresh token is unavailable. Please log in again.",
    );
  }

  const refreshed = await refreshAccessToken(refreshToken);
  const newExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000);

  await prisma.spotifyAccount.update({
    where: {
      id: account.id,
    },
    data: {
      accessTokenEncrypted: encryptString(refreshed.access_token),
      refreshTokenEncrypted: encryptString(
        refreshed.refresh_token ?? refreshToken,
      ),
      expiresAt: newExpiresAt,
    },
  });

  return refreshed.access_token;
}

async function getValidAccessToken(): Promise<{
  spotifyUserId: string;
  accessToken: string;
}> {
  const user = await requireSpotifyAccount();
  const { accessToken } = decryptSpotifyTokens(user.spotifyAccount);

  if (accessToken && !expiresSoon(user.spotifyAccount.expiresAt)) {
    return {
      spotifyUserId: user.spotifyAccount.spotifyUserId,
      accessToken,
    };
  }

  return {
    spotifyUserId: user.spotifyAccount.spotifyUserId,
    accessToken: await refreshSpotifyAccount(user.spotifyAccount),
  };
}

function getGenreSearchLimit(limit: number, genreCount: number): number {
  const perGenre = Math.ceil((limit * 3) / Math.max(genreCount, 1));
  return Math.max(limit, Math.min(perGenre, 50));
}

export async function fetchSpotifyProfile(
  accessToken: string,
): Promise<SpotifyProfile> {
  return spotifyFetch<SpotifyProfile>("/me", {
    accessToken,
  });
}

export async function searchTracksByGenres(
  genres: string[],
  limit: number,
): Promise<SpotifyTrack[]> {
  const { accessToken } = await getValidAccessToken();
  const deduped = new Map<string, SpotifyTrack>();
  const perGenreLimit = getGenreSearchLimit(limit, genres.length);

  await Promise.all(
    genres.map(async (genre) => {
      const searchParams = new URLSearchParams({
        q: `genre:"${genre}"`,
        type: "track",
        limit: String(perGenreLimit),
      });

      const response = await spotifyFetch<SpotifySearchTracksResponse>(
        "/search",
        {
          accessToken,
          searchParams,
        },
      );

      for (const item of response.tracks.items) {
        deduped.set(item.id, item);
      }
    }),
  );

  return Array.from(deduped.values());
}

export async function fetchAudioFeatures(
  trackIds: string[],
): Promise<Map<string, SpotifyAudioFeatures | null>> {
  const { accessToken } = await getValidAccessToken();
  const chunks: string[][] = [];

  for (let index = 0; index < trackIds.length; index += 100) {
    chunks.push(trackIds.slice(index, index + 100));
  }

  const features = new Map<string, SpotifyAudioFeatures | null>();

  for (const chunk of chunks) {
    const response = await spotifyFetch<SpotifyAudioFeaturesResponse>(
      "/audio-features",
      {
        accessToken,
        searchParams: new URLSearchParams({
          ids: chunk.join(","),
        }),
      },
    );

    for (const feature of response.audio_features) {
      if (!feature) {
        continue;
      }

      features.set(feature.id, feature);
    }
  }

  return features;
}

export async function fetchTracks(trackIds: string[]): Promise<SpotifyTrack[]> {
  const { accessToken } = await getValidAccessToken();
  const results: SpotifyTrack[] = [];

  for (let index = 0; index < trackIds.length; index += 50) {
    const response = await spotifyFetch<SpotifyTracksResponse>("/tracks", {
      accessToken,
      searchParams: new URLSearchParams({
        ids: trackIds.slice(index, index + 50).join(","),
      }),
    });

    results.push(...response.tracks.filter(isSpotifyTrack));
  }

  return results;
}

export async function createSpotifyPlaylist(input: {
  name: string;
  isPublic: boolean;
  description?: string;
}): Promise<SpotifyPlaylistResponse> {
  const { accessToken, spotifyUserId } = await getValidAccessToken();

  return spotifyFetch<SpotifyPlaylistResponse>(
    `/users/${spotifyUserId}/playlists`,
    {
      accessToken,
      method: "POST",
      body: {
        name: input.name,
        public: input.isPublic,
        description: input.description,
      },
    },
  );
}

export async function addTracksToSpotifyPlaylist(
  playlistId: string,
  trackUris: string[],
): Promise<void> {
  const { accessToken } = await getValidAccessToken();

  for (let index = 0; index < trackUris.length; index += 100) {
    await spotifyFetch<void>(`/playlists/${playlistId}/tracks`, {
      accessToken,
      method: "POST",
      body: {
        uris: trackUris.slice(index, index + 100),
      },
    });
  }
}
