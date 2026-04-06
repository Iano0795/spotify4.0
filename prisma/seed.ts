import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

import { MOOD_PROFILES } from "../src/lib/mood/profiles";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not configured.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: databaseUrl,
  }),
});

async function main() {
  for (const mood of MOOD_PROFILES) {
    await prisma.moodProfile.upsert({
      where: {
        key: mood.key,
      },
      update: {
        label: mood.label,
        energy: mood.energy,
        valence: mood.valence,
        tempo: mood.tempo,
        danceability: mood.danceability,
        acousticness: mood.acousticness,
      },
      create: mood,
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
