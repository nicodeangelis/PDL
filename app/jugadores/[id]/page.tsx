"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, RefreshCw, Trophy } from "lucide-react";
import type { CareerStats, HistoryEntry, Player } from "@/lib/types";

export default function JugadorDetailPage() {
  const routeParams = useParams();
  const id = typeof routeParams.id === "string" ? routeParams.id : null;
  const [player, setPlayer] = useState<Player | null>(null);
  const [career, setCareer] = useState<CareerStats | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setErr(null);
    setLoading(true);
    try {
      const r = await fetch(`/api/players/${id}`);
      if (r.status === 404) {
        setPlayer(null);
        setErr("Jugador no encontrado");
        return;
      }
      if (!r.ok) throw new Error("fail");
      const data = await r.json();
      setPlayer(data.player);
      setCareer(data.career);
      setHistory(data.history ?? []);
    } catch {
      setErr("No se pudo cargar");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const c = career ?? {
    tournamentsPlayed: 0,
    matchesPlayed: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    points: 0,
    gamesFor: 0,
    gamesAgainst: 0,
    lastTournamentId: null,
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <header className="sticky top-0 z-10 border-b border-stone-200 bg-white px-3 py-2">
        <div className="flex items-center justify-between">
          <Link href="/jugadores" className="p-1 text-stone-500 active:text-stone-900">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <span className="text-sm font-medium">Performance</span>
          <button
            type="button"
            onClick={() => void load()}
            className="p-1 text-stone-500"
            aria-label="Actualizar"
          >
            <RefreshCw className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </header>

      <main className="space-y-4 px-4 py-4 pb-10">
        {err && !player && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">{err}</p>
        )}
        {player && (
          <>
            <div className="rounded-xl border border-stone-200 bg-white p-4">
              <h1 className="text-lg font-medium">{player.fullName}</h1>
              <p className="text-xs text-stone-500">Nivel {player.level}</p>
            </div>

            <div className="rounded-xl border border-stone-200 bg-white p-4">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-medium">
                <Trophy className="h-4 w-4 text-amber-600" />
                Carrera
              </h2>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-lg bg-stone-50 px-3 py-2">
                  <p className="text-xs text-stone-500">Torneos</p>
                  <p className="font-medium">{c.tournamentsPlayed}</p>
                </div>
                <div className="rounded-lg bg-stone-50 px-3 py-2">
                  <p className="text-xs text-stone-500">Partidos</p>
                  <p className="font-medium">{c.matchesPlayed}</p>
                </div>
                <div className="rounded-lg bg-stone-50 px-3 py-2">
                  <p className="text-xs text-stone-500">G / P / E</p>
                  <p className="font-medium">
                    {c.wins} / {c.losses} / {c.draws}
                  </p>
                </div>
                <div className="rounded-lg bg-stone-50 px-3 py-2">
                  <p className="text-xs text-stone-500">Puntos</p>
                  <p className="font-medium">{c.points}</p>
                </div>
                <div className="col-span-2 rounded-lg bg-stone-50 px-3 py-2">
                  <p className="text-xs text-stone-500">Diferencia games</p>
                  <p
                    className={`font-medium ${
                      c.gamesFor - c.gamesAgainst > 0
                        ? "text-green-700"
                        : c.gamesFor - c.gamesAgainst < 0
                          ? "text-red-700"
                          : ""
                    }`}
                  >
                    {c.gamesFor - c.gamesAgainst > 0 ? "+" : ""}
                    {c.gamesFor - c.gamesAgainst}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-stone-200 bg-white p-4">
              <h2 className="mb-3 text-sm font-medium">Historial por torneo</h2>
              {history.length === 0 ? (
                <p className="text-xs text-stone-400">Sin torneos registrados aún</p>
              ) : (
                <ul className="space-y-2">
                  {[...history].reverse().map((h) => (
                    <li
                      key={`${h.tournamentId}-${h.dateISO}`}
                      className="flex items-center justify-between rounded-lg border border-stone-100 px-3 py-2 text-sm"
                    >
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/torneos/${h.tournamentId}/tabla`}
                          className="truncate font-medium text-stone-900 underline-offset-2 hover:underline"
                        >
                          {h.name || "Torneo"}
                        </Link>
                        <p className="text-xs text-stone-500">
                          {new Date(h.dateISO).toLocaleDateString("es-AR")}
                        </p>
                      </div>
                      <div className="text-right text-xs">
                        <p className="font-medium">#{h.rank}</p>
                        <p className="text-stone-500">{h.pointsInTournament} pts</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
