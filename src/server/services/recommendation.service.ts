import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/http/errors";
import { scoreTracks } from "@/lib/mood/scoring";
import {
  fetchAudioFeatures,
  searchTracksByGenres,
} from "@/server/services/spotify.service";
import { requireCurrentUser } from "@/server/services/auth.service";

export async function generateRecommendations(input: {
  mood: string;
  genres: string[];
  limit: number;
}) {
  const user = await requireCurrentUser();
  const mood = await prisma.moodProfile.findUnique({
    where: {
      key: input.mood,
    },
  });

  if (!mood) {
    throw new AppError("MOOD_NOT_FOUND", 404, "Mood profile does not exist.");
  }

  const candidates = await searchTracksByGenres(input.genres, input.limit);
  const featuresMap = await fetchAudioFeatures(candidates.map((track) => track.id));

  const scoredTracks = scoreTracks(
    candidates.map((track) => ({
      spotifyTrackId: track.id,
      name: track.name,
      artistNames: track.artists.map((artist) => artist.name),
      features: featuresMap.get(track.id) ?? null,
    })),
    mood,
    input.limit,
  );

  const run = await prisma.recommendationRun.create({
    data: {
      userId: user.id,
      moodKey: mood.key,
      genres: input.genres,
      requestedLimit: input.limit,
      items: {
        create: scoredTracks.map((track, index) => ({
          spotifyId: track.spotifyTrackId,
          trackName: track.name,
          artistNames: track.artistNames,
          score: track.score,
          rank: index + 1,
        })),
      },
    },
  });

  return {
    runId: run.id,
    tracks: scoredTracks,
  };
}
