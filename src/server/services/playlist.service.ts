import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/http/errors";
import {
  addTracksToSpotifyPlaylist,
  createSpotifyPlaylist,
  fetchTracks,
} from "@/server/services/spotify.service";
import { requireCurrentUser } from "@/server/services/auth.service";

export async function createGeneratedPlaylist(input: {
  name: string;
  mood: string;
  trackIds: string[];
  isPublic: boolean;
  recommendationRunId?: string;
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

  const spotifyTracks = await fetchTracks(input.trackIds);

  if (spotifyTracks.length !== input.trackIds.length) {
    throw new AppError(
      "INVALID_TRACK_IDS",
      400,
      "One or more provided track IDs are invalid.",
    );
  }

  const playlist = await createSpotifyPlaylist({
    name: input.name,
    isPublic: input.isPublic,
    description: `Generated for the ${mood.label} mood.`,
  });

  await addTracksToSpotifyPlaylist(
    playlist.id,
    spotifyTracks.map((track) => track.uri),
  );

  const savedPlaylist = await prisma.generatedPlaylist.create({
    data: {
      userId: user.id,
      recommendationRunId: input.recommendationRunId,
      spotifyPlaylistId: playlist.id,
      name: playlist.name,
      moodKey: mood.key,
      isPublic: input.isPublic,
      items: {
        create: spotifyTracks.map((track, index) => ({
          spotifyTrackId: track.id,
          trackName: track.name,
          artistNames: track.artists.map((artist) => artist.name),
          position: index,
        })),
      },
    },
  });

  return {
    id: savedPlaylist.id,
    spotifyPlaylistId: playlist.id,
    name: playlist.name,
  };
}
