import { toErrorResponse } from "@/lib/http/errors";
import { requireCurrentUser } from "@/server/services/auth.service";

export async function GET() {
  try {
    const user = await requireCurrentUser();

    return Response.json({
      id: user.id,
      displayName: user.displayName,
      spotifyConnected: Boolean(user.spotifyAccount),
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
