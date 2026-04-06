import type { MoodProfile } from "@prisma/client";

export type TrackAudioFeatures = {
  id: string;
  energy: number | null;
  valence: number | null;
  tempo: number | null;
  danceability: number | null;
  acousticness: number | null;
};

export type TrackCandidate = {
  spotifyTrackId: string;
  name: string;
  artistNames: string[];
  features: TrackAudioFeatures | null;
};

export type ScoredTrack = {
  spotifyTrackId: string;
  name: string;
  artistNames: string[];
  score: number;
};

function clamp(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function normalizeTempoScore(tempo: number, targetTempo: number): number {
  const difference = Math.abs(tempo - targetTempo);
  const normalized = 1 - difference / Math.max(targetTempo, 1);
  return clamp(normalized);
}

export function scoreTracks(
  tracks: TrackCandidate[],
  target: MoodProfile,
  limit: number,
): ScoredTrack[] {
  return tracks
    .flatMap((track) => {
      const features = track.features;

      if (
        !features ||
        features.energy === null ||
        features.valence === null ||
        features.tempo === null ||
        features.danceability === null ||
        features.acousticness === null
      ) {
        return [];
      }

      const score =
        0.3 * clamp(1 - Math.abs(features.energy - target.energy)) +
        0.3 * clamp(1 - Math.abs(features.valence - target.valence)) +
        0.2 * normalizeTempoScore(features.tempo, target.tempo) +
        0.1 *
          clamp(1 - Math.abs(features.danceability - target.danceability)) +
        0.1 *
          clamp(1 - Math.abs(features.acousticness - target.acousticness));

      return [
        {
          spotifyTrackId: track.spotifyTrackId,
          name: track.name,
          artistNames: track.artistNames,
          score: Number(score.toFixed(4)),
        },
      ];
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, limit);
}
