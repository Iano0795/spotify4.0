import { toErrorResponse } from "@/lib/http/errors";
import { deleteCurrentSession } from "@/server/services/auth.service";

export async function POST() {
  try {
    await deleteCurrentSession();
    return new Response(null, { status: 204 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
