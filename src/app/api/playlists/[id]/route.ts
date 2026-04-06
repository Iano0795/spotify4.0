import { prisma } from "@/lib/db/prisma";
import { AppError, toErrorResponse } from "@/lib/http/errors";
import { requireCurrentUser } from "@/server/services/auth.service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireCurrentUser();
    const { id } = await params;

    const playlist = await prisma.generatedPlaylist.findFirst({
      where: {
        id,
        userId: user.id,
      },
      include: {
        items: {
          orderBy: {
            position: "asc",
          },
        },
      },
    });

    if (!playlist) {
      throw new AppError("PLAYLIST_NOT_FOUND", 404, "Playlist not found.");
    }

    return Response.json({
      id: playlist.id,
      spotifyPlaylistId: playlist.spotifyPlaylistId,
      name: playlist.name,
      mood: playlist.moodKey,
      isPublic: playlist.isPublic,
      createdAt: playlist.createdAt,
      tracks: playlist.items.map((item) => ({
        spotifyTrackId: item.spotifyTrackId,
        name: item.trackName,
        artistNames: item.artistNames,
        position: item.position,
      })),
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
