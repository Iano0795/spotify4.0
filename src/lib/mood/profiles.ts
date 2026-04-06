export type MoodSeedProfile = {
  key: string;
  label: string;
  energy: number;
  valence: number;
  tempo: number;
  danceability: number;
  acousticness: number;
};

export const MOOD_PROFILES: MoodSeedProfile[] = [
  {
    key: "focus",
    label: "Focus",
    energy: 0.45,
    valence: 0.45,
    tempo: 110,
    danceability: 0.4,
    acousticness: 0.35,
  },
  {
    key: "chill",
    label: "Chill",
    energy: 0.3,
    valence: 0.6,
    tempo: 92,
    danceability: 0.48,
    acousticness: 0.55,
  },
  {
    key: "happy",
    label: "Happy",
    energy: 0.72,
    valence: 0.86,
    tempo: 124,
    danceability: 0.7,
    acousticness: 0.2,
  },
  {
    key: "sad",
    label: "Sad",
    energy: 0.24,
    valence: 0.18,
    tempo: 78,
    danceability: 0.26,
    acousticness: 0.68,
  },
  {
    key: "energetic",
    label: "Energetic",
    energy: 0.9,
    valence: 0.65,
    tempo: 132,
    danceability: 0.74,
    acousticness: 0.08,
  },
];
