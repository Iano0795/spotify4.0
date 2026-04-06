import { z } from "zod";

const serverEnvSchema = z.object({
  SPOTIFY_CLIENT_ID: z.string().min(1),
  SPOTIFY_CLIENT_SECRET: z.string().min(1),
  SPOTIFY_REDIRECT_URI: z.string().url(),
  DATABASE_URL: z.string().min(1),
  ENCRYPTION_SECRET: z.string().min(1),
  SESSION_COOKIE_NAME: z.string().min(1).optional(),
  APP_URL: z.string().url().optional(),
});

type ServerEnv = z.infer<typeof serverEnvSchema> & {
  SESSION_COOKIE_NAME: string;
};

let cachedEnv: ServerEnv | null = null;

export function getServerEnv(): ServerEnv {
  if (cachedEnv) {
    return cachedEnv;
  }

  const parsed = serverEnvSchema.safeParse(process.env);

  if (!parsed.success) {
    const message = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join(", ");

    throw new Error(`Invalid server environment: ${message}`);
  }

  cachedEnv = {
    ...parsed.data,
    SESSION_COOKIE_NAME:
      parsed.data.SESSION_COOKIE_NAME ?? "spotify4_session",
  };

  return cachedEnv;
}
