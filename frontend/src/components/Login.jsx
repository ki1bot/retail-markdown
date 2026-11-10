import { useState } from "react";

import { api } from "../lib/api";

export default function Login({ onLogin, initialError = "" }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(initialError);

  async function handleSubmit(event) {
    event.preventDefault();

    setLoading(true);
    setError("");

    try {
      await api.get("/auth/csrf/");

      const response = await api.post("/auth/login/", {
        username,
        password,
      });

      await api.get("/auth/csrf/");

      onLogin(response.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#09090b] px-5 text-zinc-100">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Retail Markdown
          </h1>

          <p className="mt-2 text-sm text-zinc-400">
            Masuk untuk mengelola analisis dan simulasi diskon.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-5 rounded-lg border border-zinc-800 bg-[#111114] p-6"
        >
          <div>
            <label
              htmlFor="username"
              className="mb-2 block text-sm text-zinc-300"
            >
              Username
            </label>

            <input
              id="username"
              type="text"
              required
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-zinc-500"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm text-zinc-300"
            >
              Password
            </label>

            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-zinc-500"
            />
          </div>

          {error && (
            <p className="rounded-md border border-red-900 bg-red-950/40 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:opacity-50"
          >
            {loading ? "Memproses..." : "Masuk"}
          </button>
        </form>
      </div>
    </div>
  );
}
