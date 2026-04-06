import { randomBytes } from "node:crypto";

import { buildSpotifyLoginUrl } from "@/lib/spotify/auth";
import { setOAuthStateCookie } from "@/server/services/auth.service";

export async function GET() {
  const state = randomBytes(16).toString("hex");
  await setOAuthStateCookie(state);

  return Response.redirect(buildSpotifyLoginUrl(state), 307);
}
