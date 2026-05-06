"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, Trophy } from "lucide-react";
import { computeStandings } from "@/lib/standings/compute-standings";
import type { MatchRow, Player, Tournament } from "@/lib/types";

export default function TablaPage() {
  const { id: tid } = useParams();
  const id = typeof tid === "string" ? tid : null;

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [playersById, setPlayersById] = useState<Record<string, Player>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [tr, mRes, plRes] = await Promise.all([
        fetch(`/api/tournaments/${id}`),
        fetch(`/api/tournaments/${id}/matches`),
        fetch("/api/players"),
      ]);
      if (tr.ok) setTournament(await tr.json());
      if (mRes.ok) {
        const m = await mRes.json();
        setMatches(Array.isArray(m) ? m : []);
      }
      if (plRes.ok) {
        const pl: Player[] = await plRes.json();
        const map: Record<string, Player> = {};
        for (const p of pl) map[p.id] = p;
        setPlayersById(map);
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const pmap = useMemo(() => {
    const m = new Map<string, Pick<Player, "id" | "fullName" | "level">>();
    if (!tournament) return m;
    for (const pid of tournament.participantIds) {
      const p = playersById[pid];
      if (p) m.set(pid, { id: p.id, fullName: p.fullName, level: p.level });
      else m.set(pid, { id: pid, fullName: "Jugador", level: 0 });
    }
    return m;
  }, [tournament, playersById]);

  const standings = useMemo(() => computeStandings(matches, pmap), [matches, pmap]);

  const completedMatches = matches.filter((m) => m.score1 !== "" && m.score2 !== "").length;

  if (!id) return null;

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <header className="sticky top-0 z-10 border-b border-stone-200 bg-white px-4 py-3">
        <div className="flex items-center justify-between">
          <Link href={`/torneos/${id}/fixture`} className="text-stone-500 active:text-stone-900">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-base font-medium">Tabla final</h1>
          <div className="w-5" />
        </div>
        <p className="mt-1 text-xs text-stone-500">
          {completedMatches}/{matches.length} partidos jugados
        </p>
      </header>

      <main className="px-4 py-4 pb-8">
        {loading && !tournament ? (
          <p className="text-center text-xs text-stone-400">Cargando…</p>
        ) : (
          <>
            <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
              <div className="grid grid-cols-12 gap-1 border-b border-stone-200 bg-stone-50 px-3 py-2 text-xs font-medium text-stone-500">
                <div className="col-span-1">#</div>
                <div className="col-span-5">Jugador</div>
                <div className="col-span-2 text-center">PJ</div>
                <div className="col-span-2 text-center">Dif</div>
                <div className="col-span-2 text-right">Pts</div>
              </div>
              {standings.map((p, i) => (
                <div
                  key={p.playerId}
                  className={`grid grid-cols-12 gap-1 border-b border-stone-100 px-3 py-2.5 text-sm last:border-0 ${
                    i === 0 ? "bg-amber-50" : ""
                  }`}
                >
                  <div
                    className={`col-span-1 font-medium ${
                      i === 0 ? "text-amber-700" : i < 3 ? "text-stone-700" : "text-stone-400"
                    }`}
                  >
                    {i + 1}
                  </div>
                  <div className="col-span-5 truncate">
                    <Link href={`/jugadores/${p.playerId}`} className="underline-offset-2 hover:underline">
                      {p.fullName}
                    </Link>
                    <span className="ml-1 text-xs text-stone-400">Nv{p.level}</span>
                  </div>
                  <div className="col-span-2 text-center text-stone-600">{p.played}</div>
                  <div
                    className={`col-span-2 text-center ${
                      p.gamesFor - p.gamesAgainst > 0
                        ? "text-green-700"
                        : p.gamesFor - p.gamesAgainst < 0
                          ? "text-red-700"
                          : "text-stone-500"
                    }`}
                  >
                    {p.gamesFor - p.gamesAgainst > 0 ? "+" : ""}
                    {p.gamesFor - p.gamesAgainst}
                  </div>
                  <div className="col-span-2 text-right font-medium">{p.points}</div>
                </div>
              ))}
            </div>

            {standings.length > 0 && completedMatches === matches.length && matches.length > 0 && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-center">
                <Trophy className="mx-auto mb-2 h-8 w-8 text-amber-600" />
                <p className="mb-1 text-xs text-amber-900">Ganador</p>
                <p className="text-lg font-medium text-amber-900">{standings[0]?.fullName}</p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
