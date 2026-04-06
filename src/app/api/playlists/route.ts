import { z } from "zod";

import { prisma } from "@/lib/db/prisma";
import { toErrorResponse } from "@/lib/http/errors";
import { createGeneratedPlaylist } from "@/server/services/playlist.service";
import { requireCurrentUser } from "@/server/services/auth.service";

const playlistSchema = z.object({
  name: z.string().min(1).max(100),
  mood: z.string().min(1),
  trackIds: z.array(z.string().min(1)).min(1).max(50),
  isPublic: z.boolean().default(false),
  recommendationRunId: z.string().min(1).optional(),
});

export async function GET() {
  try {
    const user = await requireCurrentUser();
    const playlists = await prisma.generatedPlaylist.findMany({
      where: {
        userId: user.id,
      },
      select: {
        id: true,
        spotifyPlaylistId: true,
        name: true,
        moodKey: true,
        isPublic: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return Response.json({ playlists });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = playlistSchema.parse(await request.json());
    const playlist = await createGeneratedPlaylist(body);

    return Response.json(
      {
        id: playlist.id,
        spotifyPlaylistId: playlist.spotifyPlaylistId,
        name: playlist.name,
      },
      { status: 201 },
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
