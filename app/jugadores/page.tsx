"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, Plus, RefreshCw, Trash2, Trophy, Users } from "lucide-react";
import type { Player } from "@/lib/types";

export default function JugadoresPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [level, setLevel] = useState(3);

  const load = useCallback(async () => {
    setErr(null);
    setLoading(true);
    try {
      const r = await fetch("/api/players");
      if (!r.ok) throw new Error("No se pudo cargar");
      const data = await r.json();
      setPlayers(data);
    } catch {
      setErr("Revisá la conexión y las variables KV en Vercel.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function addPlayer() {
    if (!fullName.trim()) return;
    const r = await fetch("/api/players", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName: fullName.trim(), level }),
    });
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      setErr(String(j.error ?? "Error al crear"));
      return;
    }
    setFullName("");
    setLevel(3);
    void load();
  }

  async function removePlayer(id: string) {
    if (!confirm("¿Eliminar jugador?")) return;
    const r = await fetch(`/api/players/${id}`, { method: "DELETE" });
    if (!r.ok) {
      setErr("No se pudo eliminar");
      return;
    }
    void load();
  }

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <header className="sticky top-0 z-10 border-b border-stone-200 bg-white px-3 py-2">
        <div className="flex items-center justify-between">
          <Link href="/" className="p-1 text-stone-500 active:text-stone-900">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div className="flex items-center gap-2 text-sm font-medium">
            <Users className="h-4 w-4 text-stone-500" />
            Jugadores
          </div>
          <button
            type="button"
            onClick={() => void load()}
            className="p-1 text-stone-500 active:text-stone-900"
            aria-label="Actualizar"
          >
            <RefreshCw className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </header>

      <main className="space-y-5 px-4 py-4 pb-28">
        {err && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">{err}</p>
        )}

        <section className="rounded-xl border border-stone-200 bg-white p-4">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-medium">
            <Trophy className="h-4 w-4 text-amber-600" />
            Nuevo jugador
          </h2>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Nombre completo"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void addPlayer()}
              className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-stone-900 focus:outline-none"
            />
            <select
              value={level}
              onChange={(e) => setLevel(Number(e.target.value))}
              className="rounded-lg border border-stone-300 bg-white px-2 py-2 text-sm focus:border-stone-900 focus:outline-none"
            >
              {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                <option key={n} value={n}>
                  Nv {n}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => void addPlayer()}
              className="rounded-lg bg-stone-900 px-3 py-2 text-white active:bg-stone-700"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </section>

        <section className="rounded-xl border border-stone-200 bg-white p-4">
          <h2 className="mb-3 flex items-center justify-between text-sm font-medium">
            <span className="flex items-center gap-2">
              <Users className="h-4 w-4 text-stone-500" />
              Lista
            </span>
            <span className="text-xs text-stone-500">{players.length}</span>
          </h2>
          {loading && players.length === 0 ? (
            <p className="py-6 text-center text-xs text-stone-400">Cargando…</p>
          ) : players.length === 0 ? (
            <p className="py-6 text-center text-xs text-stone-400">Todavía no hay jugadores</p>
          ) : (
            <ul className="space-y-1.5">
              {players.map((p, i) => (
                <li
                  key={p.id}
                  className="flex items-center gap-2 rounded-lg bg-stone-50 px-3 py-2"
                >
                  <span className="w-5 text-xs text-stone-400">{i + 1}</span>
                  <Link href={`/jugadores/${p.id}`} className="flex-1 truncate text-sm font-medium text-stone-900">
                    {p.fullName}
                  </Link>
                  <span className="rounded bg-stone-200 px-2 py-0.5 text-xs font-medium">Nv {p.level}</span>
                  <button
                    type="button"
                    onClick={() => void removePlayer(p.id)}
                    className="text-stone-400 active:text-red-600"
                    aria-label="Eliminar"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
