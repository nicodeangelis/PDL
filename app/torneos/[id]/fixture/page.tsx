"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  GripVertical,
  Plus,
  RefreshCw,
  Trophy,
} from "lucide-react";
import type { MatchRow, Player, Tournament } from "@/lib/types";
import { randomUUID } from "@/lib/uuid";

export default function FixturePage() {
  const { id: tid } = useParams();
  const id = typeof tid === "string" ? tid : null;

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [playersById, setPlayersById] = useState<Record<string, Player>>({});
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [genLoading, setGenLoading] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setErr(null);
    setLoading(true);
    try {
      const [tr, mRes, plRes] = await Promise.all([
        fetch(`/api/tournaments/${id}`),
        fetch(`/api/tournaments/${id}/matches`),
        fetch("/api/players"),
      ]);
      if (!tr.ok) {
        setErr("Torneo no encontrado");
        return;
      }
      const t: Tournament = await tr.json();
      setTournament(t);
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
    } catch {
      setErr("Error de red");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const participantList = useMemo(() => {
    if (!tournament) return [];
    return tournament.participantIds
      .map((pid) => playersById[pid])
      .filter(Boolean) as Player[];
  }, [tournament, playersById]);

  const opts = useMemo(() => {
    return participantList.map((p) => (
      <option key={p.id} value={p.id}>
        {p.fullName}
      </option>
    ));
  }, [participantList]);

  async function persist(next: MatchRow[]) {
    if (!id) return;
    setSaving(true);
    try {
      const ordered = next.map((m, i) => ({ ...m, order: i }));
      const r = await fetch(`/api/tournaments/${id}/matches`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matches: ordered }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        setErr(String(j.error ?? "No se pudo guardar"));
        return;
      }
      setMatches(await r.json());
    } finally {
      setSaving(false);
    }
  }

  async function generateFixture() {
    if (!id) return;
    setGenLoading(true);
    setErr(null);
    try {
      const r = await fetch(`/api/tournaments/${id}/generate-fixture`, { method: "POST" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setErr(String(j.error ?? "No se pudo generar"));
        return;
      }
      setMatches(j);
    } finally {
      setGenLoading(false);
    }
  }

  function updateMatch(mid: string, patch: Partial<MatchRow>) {
    setMatches((prev) => prev.map((m) => (m.id === mid ? { ...m, ...patch } : m)));
  }

  function moveMatch(index: number, dir: -1 | 1) {
    setMatches((prev) => {
      const next = [...prev];
      const j = index + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[index], next[j]] = [next[j], next[index]];
      return next;
    });
  }

  function addManualMatch() {
    if (participantList.length < 4) {
      setErr("Necesitás al menos 4 participantes en el torneo");
      return;
    }
    const [a, b, c, d] = [
      participantList[0].id,
      participantList[1].id,
      participantList[2].id,
      participantList[3].id,
    ];
    const courts = tournament?.courts ?? 1;
    const duration = tournament?.matchTimeMin ?? 15;
    const row: MatchRow = {
      id: `m-${randomUUID()}`,
      order: matches.length,
      team1: [a, b],
      team2: [c, d],
      score1: "",
      score2: "",
      court: (matches.length % courts) + 1,
      duration,
    };
    setMatches((prev) => [...prev, row]);
  }

  const completedMatches = matches.filter((m) => m.score1 !== "" && m.score2 !== "").length;

  if (!id) return null;

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <header className="sticky top-0 z-10 border-b border-stone-200 bg-white px-2 py-2">
        <div className="flex items-center justify-between">
          <Link href={`/torneos/${id}`} className="-ml-1 p-1 text-stone-500">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div className="flex items-center gap-2 text-xs">
            <span className="font-medium">Fixture</span>
            <span className="text-stone-400">·</span>
            <span className="text-stone-500">
              {completedMatches}/{matches.length}
            </span>
            <span className="text-stone-400">·</span>
            <span className="text-stone-500">{tournament?.matchTimeMin ?? "—"}min</span>
          </div>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => void load()} className="p-1 text-stone-500">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <Link href={`/torneos/${id}/tabla`} className="-mr-1 p-1 text-amber-600">
              <Trophy className="h-5 w-5" />
            </Link>
          </div>
        </div>
        <div className="mt-1.5 h-0.5 overflow-hidden rounded-full bg-stone-200">
          <div
            className="h-full bg-amber-500 transition-all"
            style={{
              width: `${matches.length ? (completedMatches / matches.length) * 100 : 0}%`,
            }}
          />
        </div>
      </header>

      <main className="space-y-3 px-2 py-2 pb-40">
        {err && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-2 py-2 text-xs text-red-800">{err}</p>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={genLoading}
            onClick={() => void generateFixture()}
            className="flex-1 rounded-lg bg-stone-900 px-3 py-2 text-xs font-medium text-white disabled:bg-stone-400"
          >
            {genLoading ? "Generando…" : "Generar fixture"}
          </button>
          <button
            type="button"
            onClick={() => addManualMatch()}
            className="flex items-center gap-1 rounded-lg border border-stone-300 px-3 py-2 text-xs font-medium"
          >
            <Plus className="h-3 w-3" />
            Partido manual
          </button>
        </div>

        {loading && !tournament ? (
          <p className="py-8 text-center text-xs text-stone-400">Cargando…</p>
        ) : (
          <ul className="space-y-1.5">
            {matches.map((m, idx) => {
              const filled = m.score1 !== "" && m.score2 !== "";
              const w1 = filled && parseInt(m.score1, 10) > parseInt(m.score2, 10);
              const w2 = filled && parseInt(m.score2, 10) > parseInt(m.score1, 10);
              const n = (pid: string) => playersById[pid]?.fullName ?? pid.slice(0, 6);

              return (
                <li
                  key={m.id}
                  className={`rounded-lg border bg-white px-2 py-2 ${
                    filled ? "border-stone-300" : "border-stone-200"
                  }`}
                >
                  <div className="mb-1.5 flex items-center justify-between text-[10px] text-stone-500">
                    <span className="flex items-center gap-1 font-medium">
                      <GripVertical className="h-3 w-3 text-stone-300" />
                      P{idx + 1} · C{m.court}
                    </span>
                    <span className="flex gap-0.5">
                      <button
                        type="button"
                        className="rounded p-0.5 text-stone-400"
                        onClick={() => moveMatch(idx, -1)}
                      >
                        <ArrowUp className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        className="rounded p-0.5 text-stone-400"
                        onClick={() => moveMatch(idx, 1)}
                      >
                        <ArrowDown className="h-3 w-3" />
                      </button>
                    </span>
                  </div>

                  <div className="mb-2 grid grid-cols-2 gap-1 text-[10px]">
                    <select
                      value={m.team1[0]}
                      onChange={(e) =>
                        updateMatch(m.id, { team1: [e.target.value, m.team1[1]] as [string, string] })
                      }
                      className="rounded border border-stone-200 bg-stone-50 py-1"
                    >
                      {opts}
                    </select>
                    <select
                      value={m.team1[1]}
                      onChange={(e) =>
                        updateMatch(m.id, { team1: [m.team1[0], e.target.value] as [string, string] })
                      }
                      className="rounded border border-stone-200 bg-stone-50 py-1"
                    >
                      {opts}
                    </select>
                    <select
                      value={m.team2[0]}
                      onChange={(e) =>
                        updateMatch(m.id, { team2: [e.target.value, m.team2[1]] as [string, string] })
                      }
                      className="rounded border border-stone-200 bg-stone-50 py-1"
                    >
                      {opts}
                    </select>
                    <select
                      value={m.team2[1]}
                      onChange={(e) =>
                        updateMatch(m.id, { team2: [m.team2[0], e.target.value] as [string, string] })
                      }
                      className="rounded border border-stone-200 bg-stone-50 py-1"
                    >
                      {opts}
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <div
                      className={`min-w-0 flex-1 rounded px-2 py-1.5 text-xs leading-tight ${
                        w1 ? "bg-green-50 text-green-900" : "bg-stone-50"
                      }`}
                    >
                      <p className="truncate font-medium">{n(m.team1[0])}</p>
                      <p className="truncate font-medium">{n(m.team1[1])}</p>
                    </div>
                    <input
                      type="number"
                      min={0}
                      inputMode="numeric"
                      value={m.score1}
                      onChange={(e) => updateMatch(m.id, { score1: e.target.value })}
                      className="h-10 w-9 shrink-0 rounded border border-stone-300 bg-white text-center text-base font-medium focus:border-stone-900 focus:outline-none"
                    />
                    <input
                      type="number"
                      min={0}
                      inputMode="numeric"
                      value={m.score2}
                      onChange={(e) => updateMatch(m.id, { score2: e.target.value })}
                      className="h-10 w-9 shrink-0 rounded border border-stone-300 bg-white text-center text-base font-medium focus:border-stone-900 focus:outline-none"
                    />
                    <div
                      className={`min-w-0 flex-1 rounded px-2 py-1.5 text-right text-xs leading-tight ${
                        w2 ? "bg-green-50 text-green-900" : "bg-stone-50"
                      }`}
                    >
                      <p className="truncate font-medium">{n(m.team2[0])}</p>
                      <p className="truncate font-medium">{n(m.team2[1])}</p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>

      <div className="fixed bottom-0 left-0 right-0 space-y-2 border-t border-stone-200 bg-white px-3 py-2">
        <button
          type="button"
          disabled={saving}
          onClick={() => void persist(matches)}
          className="w-full rounded-lg bg-amber-600 py-2.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {saving ? "Guardando…" : "Guardar partidos"}
        </button>
        <Link
          href={`/torneos/${id}/tabla`}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-stone-900 py-2.5 text-sm font-medium text-white"
        >
          Ver tabla
          <Trophy className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
