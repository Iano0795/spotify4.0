import { z } from "zod";

import { toErrorResponse } from "@/lib/http/errors";
import { generateRecommendations } from "@/server/services/recommendation.service";

const recommendationsSchema = z.object({
  mood: z.string().min(1),
  genres: z.array(z.string().min(1)).min(1).max(5),
  limit: z.number().int().min(1).max(50).default(20),
});

export async function POST(request: Request) {
  try {
    const body = recommendationsSchema.parse(await request.json());
    const result = await generateRecommendations(body);

    return Response.json({
      runId: result.runId,
      tracks: result.tracks,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
