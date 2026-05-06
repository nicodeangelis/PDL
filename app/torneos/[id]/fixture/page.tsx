"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  Pencil,
  Plus,
  RefreshCw,
  Trophy,
  Trash2,
  Lock,
  Unlock,
} from "lucide-react";
import type { MatchRow, Player, Tournament } from "@/lib/types";
import { randomUUID } from "@/lib/uuid";
import { TournamentLockModal } from "@/components/tournament-lock-modal";

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
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);
  const [draft, setDraft] = useState<MatchRow | null>(null);
  const [lockModal, setLockModal] = useState<null | "lock" | "unlock">(null);

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
    if (tournament?.locked) {
      setErr("Torneo bloqueado.");
      return;
    }
    setGenLoading(true);
    setErr(null);
    try {
      const r = await fetch(`/api/tournaments/${id}/generate-fixture`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
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
    if (tournament?.locked) {
      setErr("Torneo bloqueado.");
      return;
    }
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

  function deleteMatch(mid: string) {
    if (tournament?.locked) {
      setErr("Torneo bloqueado.");
      return;
    }
    setMatches((prev) => prev.filter((m) => m.id !== mid).map((m, idx) => ({ ...m, order: idx })));
  }

  function openEditModal(mid: string) {
    const match = matches.find((m) => m.id === mid);
    if (!match) return;
    setEditingMatchId(mid);
    setDraft({ ...match });
  }

  function closeEditModal() {
    setEditingMatchId(null);
    setDraft(null);
  }

  function applyEditModal() {
    if (!editingMatchId || !draft) return;
    if (tournament?.locked) {
      setErr("Torneo bloqueado.");
      return;
    }
    updateMatch(editingMatchId, {
      team1: draft.team1,
      team2: draft.team2,
      court: draft.court,
      duration: draft.duration,
    });
    closeEditModal();
  }

  async function submitLockModal(password: string): Promise<boolean> {
    if (!id || !lockModal) return false;
    setErr(null);
    const r = await fetch(`/api/tournaments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locked: lockModal === "lock", lockPassword: password }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      setErr(String(j.error ?? "No se pudo actualizar bloqueo"));
      return false;
    }
    setTournament(j);
    return true;
  }

  function autocompleteMatchesByTime() {
    if (!tournament) return;
    if (tournament.locked) {
      setErr("Torneo bloqueado.");
      return;
    }
    const n = participantList.length;
    if (n < 4 || n % 4 !== 0) {
      setErr("Necesitás un múltiplo de 4 jugadores para autocompletar.");
      return;
    }
    const numPairs = n / 2;
    const targetMatches = (numPairs * (numPairs - 1)) / 2;
    const missing = targetMatches - matches.length;
    if (missing <= 0) {
      setErr("Ya está completo para el tiempo configurado.");
      return;
    }

    const played = new Map<string, number>();
    participantList.forEach((p) => played.set(p.id, 0));
    matches.forEach((m) => {
      const scored = m.score1 !== "" && m.score2 !== "";
      if (!scored) return;
      [...m.team1, ...m.team2].forEach((pid) => played.set(pid, (played.get(pid) ?? 0) + 1));
    });

    const nextMatches: MatchRow[] = [...matches];
    for (let i = 0; i < missing; i++) {
      const sorted = [...participantList].sort(
        (a, b) => (played.get(a.id) ?? 0) - (played.get(b.id) ?? 0) || b.level - a.level,
      );
      const selected = sorted.slice(0, 4);
      if (selected.length < 4) break;
      const team1: [string, string] = [selected[0].id, selected[3].id];
      const team2: [string, string] = [selected[1].id, selected[2].id];
      const row: MatchRow = {
        id: `m-${randomUUID()}`,
        order: nextMatches.length,
        team1,
        team2,
        score1: "",
        score2: "",
        court: (nextMatches.length % Math.max(1, tournament.courts)) + 1,
        duration: tournament.matchTimeMin,
      };
      nextMatches.push(row);
      [...team1, ...team2].forEach((pid) => played.set(pid, (played.get(pid) ?? 0) + 1));
    }
    setMatches(nextMatches);
    setErr(null);
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
            <button
              type="button"
              onClick={() => {
                if (!tournament) return;
                setLockModal(tournament.locked ? "unlock" : "lock");
              }}
              className="p-1 text-stone-500"
              aria-label={tournament?.locked ? "Desbloquear" : "Bloquear"}
            >
              {tournament?.locked ? <Lock className="h-4 w-4 text-amber-700" /> : <Unlock className="h-4 w-4" />}
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
            disabled={genLoading || Boolean(tournament?.locked)}
            onClick={() => void generateFixture()}
            className="flex-1 rounded-lg bg-stone-900 px-3 py-2 text-xs font-medium text-white disabled:bg-stone-400"
          >
            {genLoading ? "Generando…" : "Generar fixture"}
          </button>
          <button
            type="button"
            disabled={Boolean(tournament?.locked)}
            onClick={() => addManualMatch()}
            className="flex items-center gap-1 rounded-lg border border-stone-300 px-3 py-2 text-xs font-medium disabled:opacity-50"
          >
            <Plus className="h-3 w-3" />
            Partido manual
          </button>
          <button
            type="button"
            disabled={Boolean(tournament?.locked)}
            onClick={() => autocompleteMatchesByTime()}
            className="rounded-lg border border-stone-300 px-3 py-2 text-xs font-medium disabled:opacity-50"
          >
            Completar por tiempo
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
                      P{idx + 1} · C{m.court}
                    </span>
                    <span className="flex gap-0.5">
                      <button
                        type="button"
                        disabled={Boolean(tournament?.locked)}
                        className="rounded p-0.5 text-stone-400"
                        onClick={() => moveMatch(idx, -1)}
                      >
                        <ArrowUp className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        disabled={Boolean(tournament?.locked)}
                        className="rounded p-0.5 text-stone-400"
                        onClick={() => moveMatch(idx, 1)}
                      >
                        <ArrowDown className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        disabled={Boolean(tournament?.locked)}
                        className="rounded p-0.5 text-stone-400"
                        onClick={() => openEditModal(m.id)}
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        disabled={Boolean(tournament?.locked)}
                        className="rounded p-0.5 text-red-500 disabled:opacity-50"
                        onClick={() => deleteMatch(m.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </span>
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
                      disabled={Boolean(tournament?.locked)}
                      onChange={(e) => updateMatch(m.id, { score1: e.target.value })}
                      className="h-10 w-9 shrink-0 rounded border border-stone-300 bg-white text-center text-base font-medium focus:border-stone-900 focus:outline-none"
                    />
                    <input
                      type="number"
                      min={0}
                      inputMode="numeric"
                      value={m.score2}
                      disabled={Boolean(tournament?.locked)}
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
          disabled={saving || Boolean(tournament?.locked)}
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
      {editingMatchId && draft && (
        <div className="fixed inset-0 z-20 flex items-end bg-black/40 sm:items-center sm:justify-center">
          <div className="w-full max-w-md rounded-t-2xl bg-white p-4 sm:rounded-2xl">
            <h3 className="mb-3 text-sm font-medium">Editar partido</h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <select
                value={draft.team1[0]}
                onChange={(e) => setDraft({ ...draft, team1: [e.target.value, draft.team1[1]] })}
                className="rounded border border-stone-300 bg-white p-2"
              >
                {opts}
              </select>
              <select
                value={draft.team1[1]}
                onChange={(e) => setDraft({ ...draft, team1: [draft.team1[0], e.target.value] })}
                className="rounded border border-stone-300 bg-white p-2"
              >
                {opts}
              </select>
              <select
                value={draft.team2[0]}
                onChange={(e) => setDraft({ ...draft, team2: [e.target.value, draft.team2[1]] })}
                className="rounded border border-stone-300 bg-white p-2"
              >
                {opts}
              </select>
              <select
                value={draft.team2[1]}
                onChange={(e) => setDraft({ ...draft, team2: [draft.team2[0], e.target.value] })}
                className="rounded border border-stone-300 bg-white p-2"
              >
                {opts}
              </select>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <label className="text-xs text-stone-500">
                Cancha
                <input
                  type="number"
                  min={1}
                  value={draft.court}
                  onChange={(e) => setDraft({ ...draft, court: Math.max(1, Number(e.target.value) || 1) })}
                  className="mt-1 w-full rounded border border-stone-300 p-2"
                />
              </label>
              <label className="text-xs text-stone-500">
                Duración
                <input
                  type="number"
                  min={5}
                  value={draft.duration}
                  onChange={(e) =>
                    setDraft({ ...draft, duration: Math.max(5, Number(e.target.value) || 15) })
                  }
                  className="mt-1 w-full rounded border border-stone-300 p-2"
                />
              </label>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                className="flex-1 rounded-lg border border-stone-300 py-2 text-sm"
                onClick={closeEditModal}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="flex-1 rounded-lg bg-stone-900 py-2 text-sm text-white"
                onClick={applyEditModal}
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      <TournamentLockModal
        open={lockModal !== null}
        title={lockModal === "lock" ? "Bloquear torneo" : "Desbloquear torneo"}
        description="Ingresá la contraseña para confirmar."
        confirmLabel={lockModal === "lock" ? "Bloquear" : "Desbloquear"}
        onClose={() => setLockModal(null)}
        onSubmit={submitLockModal}
      />
    </div>
  );
}
