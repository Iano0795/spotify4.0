import { prisma } from "@/lib/db/prisma";
import { toErrorResponse } from "@/lib/http/errors";

export async function GET() {
  try {
    const moods = await prisma.moodProfile.findMany({
      select: {
        key: true,
        label: true,
      },
      orderBy: {
        label: "asc",
      },
    });

    return Response.json({ moods });
  } catch (error) {
    return toErrorResponse(error);
  }
}
