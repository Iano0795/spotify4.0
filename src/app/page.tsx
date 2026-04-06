const endpoints = [
  "GET /api/auth/spotify/login",
  "GET /api/auth/spotify/callback",
  "POST /api/auth/logout",
  "GET /api/me",
  "GET /api/moods",
  "POST /api/recommendations",
  "GET /api/playlists",
  "POST /api/playlists",
  "GET /api/playlists/:id",
];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col justify-center px-6 py-16">
      <div className="rounded-[2rem] border border-black/5 bg-white/90 p-8 shadow-[0_30px_90px_rgba(16,20,24,0.08)] backdrop-blur">
        <p className="text-sm font-medium uppercase tracking-[0.25em] text-emerald-600">
          MVP Backend
        </p>
        <h1 className="mt-4 max-w-2xl text-4xl font-semibold tracking-tight text-slate-950">
          Spotify Mood Engine API is scaffolded inside Next.js 16.
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
          Configure the required environment variables, run Prisma against your
          local PostgreSQL instance, and use the API routes below from the
          frontend.
        </p>

        <div className="mt-10 rounded-3xl bg-slate-950 p-6 text-sm text-slate-100">
          <p className="font-mono text-emerald-300">Available endpoints</p>
          <ul className="mt-4 space-y-2 font-mono text-slate-300">
            {endpoints.map((endpoint) => (
              <li key={endpoint}>{endpoint}</li>
            ))}
          </ul>
        </div>
      </div>
    </main>
  );
}
