"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Plus,
  RefreshCw,
  Trash2,
  Users,
} from "lucide-react";
import type { FixtureMode, Player, Tournament } from "@/lib/types";
import { TournamentLockModal } from "@/components/tournament-lock-modal";
import { computeScheduleMinutes } from "@/lib/tournament-schedule-summary";

function defaultLevelForName(name: string): number {
  const normalized = name.trim().toLowerCase();
  if (normalized === "santiago" || normalized === "cristian" || normalized === "cristián") return 5;
  return 3;
}

export default function TorneoSetupPage() {
  const { id: tid } = useParams();
  const id = typeof tid === "string" ? tid : null;
  const router = useRouter();

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [dateISO, setDateISO] = useState("");
  const [courts, setCourts] = useState(2);
  const [matchTimeMin, setMatchTimeMin] = useState(15);
  const [restTimeMin, setRestTimeMin] = useState(5);
  const [totalTimeMin, setTotalTimeMin] = useState(60);
  const [fixtureMode, setFixtureMode] = useState<FixtureMode>("rotating_balanced");
  const [participantIds, setParticipantIds] = useState<string[]>([]);

  const [quickName, setQuickName] = useState("");
  const [quickLevel, setQuickLevel] = useState(3);
  const [pwdModal, setPwdModal] = useState<null | { mode: "lock" | "unlock" | "delete" }>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setErr(null);
    setLoading(true);
    try {
      const [tr, pl] = await Promise.all([fetch(`/api/tournaments/${id}`), fetch("/api/players")]);
      if (!tr.ok) {
        setErr("Torneo no encontrado");
        setTournament(null);
        return;
      }
      const t: Tournament = await tr.json();
      setTournament(t);
      setName(t.name ?? "");
      setDateISO(t.dateISO.slice(0, 10));
      setCourts(t.courts);
      setMatchTimeMin(t.matchTimeMin);
      setRestTimeMin(t.restTimeMin);
      setTotalTimeMin(t.totalTimeMin ?? 60);
      setFixtureMode(t.fixtureMode ?? "rotating_balanced");
      setParticipantIds(t.participantIds);

      if (pl.ok) setAllPlayers(await pl.json());
    } catch {
      setErr("Error de red");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedSet = useMemo(() => new Set(participantIds), [participantIds]);

  async function saveMeta(): Promise<boolean> {
    if (!id) return false;
    if (tournament?.locked) {
      setErr("Torneo bloqueado. Desbloquealo para editar.");
      return false;
    }
    setSaving(true);
    setErr(null);
    try {
      const r = await fetch(`/api/tournaments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || undefined,
          dateISO: new Date(dateISO + "T12:00:00").toISOString(),
          courts,
          matchTimeMin,
          restTimeMin,
          totalTimeMin,
          fixtureMode,
          participantIds,
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setErr(String(j.error ?? "Error al guardar"));
        return false;
      }
      setTournament(j);
      return true;
    } finally {
      setSaving(false);
    }
  }

  async function goFixture() {
    if (tournament?.locked) {
      router.push(`/torneos/${id}/fixture`);
      return;
    }
    const ok = await saveMeta();
    if (ok) router.push(`/torneos/${id}/fixture`);
  }

  function togglePlayer(pid: string) {
    setParticipantIds((prev) => {
      if (prev.includes(pid)) return prev.filter((x) => x !== pid);
      return [...prev, pid];
    });
  }

  function moveParticipant(index: number, dir: -1 | 1) {
    setParticipantIds((prev) => {
      const next = [...prev];
      const j = index + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[index], next[j]] = [next[j], next[index]];
      return next;
    });
  }

  async function quickAddPlayer() {
    if (tournament?.locked) {
      setErr("Torneo bloqueado. Desbloquealo para editar.");
      return;
    }
    if (!quickName.trim()) return;
    const computedLevel = defaultLevelForName(quickName);
    const r = await fetch("/api/players", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName: quickName.trim(), level: computedLevel }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      setErr(String(j.error ?? "No se pudo crear"));
      return;
    }
    setQuickName("");
    setQuickLevel(3);
    setAllPlayers((p) => [j, ...p]);
    setParticipantIds((prev) => [...prev, j.id]);
  }

  async function runDelete(lockPw: string): Promise<boolean> {
    if (!id) return false;
    const suffix = lockPw ? `?lockPassword=${encodeURIComponent(lockPw)}` : "";
    const r = await fetch(`/api/tournaments/${id}${suffix}`, { method: "DELETE" });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      setErr(String(j.error ?? "No se pudo eliminar"));
      return false;
    }
    router.push("/torneos");
    return true;
  }

  async function deleteTournament() {
    if (!id || !confirm("¿Eliminar torneo y todos sus partidos?")) return;
    if (tournament?.locked) {
      setPwdModal({ mode: "delete" });
      return;
    }
    await runDelete("");
  }

  async function submitPwdModal(password: string): Promise<boolean> {
    if (!id || !pwdModal) return false;
    setErr(null);
    if (pwdModal.mode === "delete") {
      return runDelete(password);
    }
    setSaving(true);
    try {
      const nextLocked = pwdModal.mode === "lock";
      const r = await fetch(`/api/tournaments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locked: nextLocked, lockPassword: password }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setErr(String(j.error ?? "No se pudo actualizar bloqueo"));
        return false;
      }
      setTournament(j);
      return true;
    } finally {
      setSaving(false);
    }
  }

  const summary = useMemo(() => {
    const n = participantIds.length;
    if (n < 4 || n % 4 !== 0) return null;
    const numPairs = n / 2;
    const numMatches = (numPairs * (numPairs - 1)) / 2;
    const { rounds, playMin, restGaps, restTotal, totalMin } = computeScheduleMinutes(
      numMatches,
      courts,
      matchTimeMin,
      restTimeMin,
    );
    const configuredTotal = Math.max(0, totalTimeMin);
    const roundsThatFit =
      configuredTotal < matchTimeMin
        ? 0
        : Math.floor((configuredTotal + restTimeMin) / (matchTimeMin + restTimeMin));
    const matchesThatFit = Math.min(numMatches, roundsThatFit * Math.max(1, courts));
    const hours = Math.floor(totalMin / 60);
    const mins = totalMin % 60;
    return { numMatches, rounds, playMin, restGaps, restTotal, hours, mins, configuredTotal, roundsThatFit, matchesThatFit };
  }, [participantIds.length, courts, matchTimeMin, restTimeMin, totalTimeMin]);

  if (!id) return null;

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <header className="sticky top-0 z-10 border-b border-stone-200 bg-white px-3 py-2">
        <div className="flex items-center justify-between">
          <Link href="/torneos" className="p-1 text-stone-500">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <span className="text-sm font-medium">Configuración</span>
          <button type="button" onClick={() => void load()} className="p-1 text-stone-500" aria-label="Actualizar">
            <RefreshCw className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </header>

      <main className="space-y-5 px-4 py-4 pb-36">
        {err && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">{err}</p>
        )}

        {loading && !tournament ? (
          <p className="py-8 text-center text-xs text-stone-400">Cargando…</p>
        ) : tournament ? (
          <>
            <section className="rounded-xl border border-stone-200 bg-white p-4">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-medium">
                <MapPin className="h-4 w-4 text-stone-500" />
                Datos del torneo
              </h2>
              <label className="mb-2 block text-xs text-stone-500">Nombre</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mb-3 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-stone-900 focus:outline-none"
              />
              <label className="mb-2 block text-xs text-stone-500">Fecha</label>
              <input
                type="date"
                value={dateISO}
                onChange={(e) => setDateISO(e.target.value)}
                className="mb-3 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-stone-900 focus:outline-none"
              />
              <div className="grid grid-cols-3 gap-2">
                <label className="block">
                  <span className="mb-1 block text-xs text-stone-500">Canchas</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={courts}
                    onChange={(e) => setCourts(Number(e.target.value))}
                    onBlur={(e) => setCourts(Math.max(1, Number(e.target.value) || 1))}
                    className="w-full rounded-lg border border-stone-300 px-2 py-2 text-sm focus:border-stone-900 focus:outline-none"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs text-stone-500">Min/partido</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={matchTimeMin}
                    onChange={(e) => setMatchTimeMin(Number(e.target.value))}
                    onBlur={(e) => setMatchTimeMin(Math.max(5, Number(e.target.value) || 15))}
                    className="w-full rounded-lg border border-stone-300 px-2 py-2 text-sm focus:border-stone-900 focus:outline-none"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs text-stone-500">Descanso</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={restTimeMin}
                    onChange={(e) => setRestTimeMin(Number(e.target.value))}
                    onBlur={(e) => setRestTimeMin(Math.max(0, Number(e.target.value) || 0))}
                    className="w-full rounded-lg border border-stone-300 px-2 py-2 text-sm focus:border-stone-900 focus:outline-none"
                  />
                </label>
              </div>
              <label className="mt-3 block">
                <span className="mb-1 block text-xs text-stone-500">Tiempo total disponible (min)</span>
                <input
                  type="number"
                  inputMode="numeric"
                  value={totalTimeMin}
                  onChange={(e) => setTotalTimeMin(Number(e.target.value))}
                  onBlur={(e) => setTotalTimeMin(Math.max(0, Number(e.target.value) || 0))}
                  className="w-full rounded-lg border border-stone-300 px-2 py-2 text-sm focus:border-stone-900 focus:outline-none"
                />
              </label>
              <label className="mt-3 block">
                <span className="mb-1 block text-xs text-stone-500">Modo de fixture</span>
                <select
                  value={fixtureMode}
                  onChange={(e) => setFixtureMode(e.target.value as FixtureMode)}
                  className="w-full rounded-lg border border-stone-300 bg-white px-2 py-2 text-sm focus:border-stone-900 focus:outline-none"
                >
                  <option value="rotating_balanced">Nivelado rotativo</option>
                  <option value="rotating_random">Aleatorio rotativo</option>
                  <option value="fixed_balanced">Equipos fijos nivelados</option>
                </select>
              </label>
              <button
                type="button"
                disabled={saving}
                onClick={() => void saveMeta()}
                className="mt-3 w-full rounded-lg border border-stone-300 py-2 text-sm font-medium active:bg-stone-50 disabled:opacity-50"
              >
                {tournament.locked ? "Torneo bloqueado" : "Guardar cambios"}
              </button>
            </section>

            <section className="rounded-xl border border-stone-200 bg-white p-4">
              <h2 className="mb-2 text-sm font-medium">Estado del torneo</h2>
              <p className="mb-3 text-xs text-stone-500">
                {tournament.locked
                  ? "Bloqueado: no se pueden cambiar participantes ni fixture. Los resultados se bloquean aparte desde el fixture."
                  : "Desbloqueado: se permiten cambios."}
              </p>
              <button
                type="button"
                disabled={saving}
                onClick={() => setPwdModal({ mode: tournament.locked ? "unlock" : "lock" })}
                className={`w-full rounded-lg py-2 text-sm font-medium ${
                  tournament.locked
                    ? "border border-emerald-200 text-emerald-700"
                    : "border border-amber-200 text-amber-700"
                }`}
              >
                {tournament.locked ? "Desbloquear torneo" : "Bloquear torneo"}
              </button>
            </section>

            <section className="rounded-xl border border-stone-200 bg-white p-4">
              <h2 className="mb-3 flex items-center justify-between text-sm font-medium">
                <span className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-stone-500" />
                  Participantes
                </span>
                <span className="text-xs text-stone-500">{participantIds.length}</span>
              </h2>
              <p className="mb-3 text-xs text-stone-500">
                Elegí jugadores (múltiplo de 4). El orden influye en la lista; el fixture ordena por nivel al generar.
              </p>

              <div className="mb-4 flex gap-2">
                <input
                  placeholder="Nuevo jugador rápido"
                  value={quickName}
                  onChange={(e) => {
                    const val = e.target.value;
                    setQuickName(val);
                    setQuickLevel(defaultLevelForName(val));
                  }}
                  className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-stone-900 focus:outline-none"
                />
                <select
                  value={quickLevel}
                  onChange={(e) => setQuickLevel(Number(e.target.value))}
                  className="rounded-lg border border-stone-300 bg-white px-2 py-2 text-sm"
                >
                  {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                    <option key={n} value={n}>
                      Nv{n}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={tournament.locked}
                  onClick={() => void quickAddPlayer()}
                  className="rounded-lg bg-stone-900 px-3 py-2 text-white disabled:bg-stone-400"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              <p className="mb-2 text-xs font-medium text-stone-600">En el torneo (orden)</p>
              <ul className="mb-4 space-y-1">
                {participantIds.map((pid, idx) => {
                  const p = allPlayers.find((x) => x.id === pid);
                  return (
                    <li
                      key={pid}
                      className="flex items-center gap-1 rounded-lg bg-amber-50/80 px-2 py-2 text-sm"
                    >
                      <button
                        type="button"
                        disabled={tournament.locked}
                        className="p-1 text-stone-400"
                        onClick={() => moveParticipant(idx, -1)}
                        aria-label="Subir"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        disabled={tournament.locked}
                        className="p-1 text-stone-400"
                        onClick={() => moveParticipant(idx, 1)}
                        aria-label="Bajar"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </button>
                      <span className="flex-1 truncate">
                        {p?.fullName ?? pid}{" "}
                        <span className="text-xs text-stone-400">Nv{p?.level ?? "?"}</span>
                      </span>
                      <button
                        type="button"
                        disabled={tournament.locked}
                        className="text-stone-400"
                        onClick={() => setParticipantIds((prev) => prev.filter((x) => x !== pid))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </li>
                  );
                })}
              </ul>

              <p className="mb-2 text-xs font-medium text-stone-600">Todos los jugadores</p>
              <ul className="max-h-48 space-y-1 overflow-y-auto">
                {allPlayers.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      disabled={tournament.locked}
                      onClick={() => togglePlayer(p.id)}
                      className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm ${
                        selectedSet.has(p.id) ? "bg-stone-900 text-white" : "bg-stone-50"
                      } disabled:opacity-50`}
                    >
                      <span className="flex-1 truncate">{p.fullName}</span>
                      <span className="text-xs opacity-80">Nv{p.level}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>

            {summary && (
              <section className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                <p className="mb-1 font-medium">Resumen de tiempo</p>
                <p>
                  {summary.numMatches} partidos en {summary.rounds} rondas ({courts} canchas en paralelo):{" "}
                  <strong>
                    {summary.playMin} min
                  </strong>{" "}
                  de juego ({summary.rounds} × {matchTimeMin} min, no {summary.numMatches} × {matchTimeMin}).
                </p>
                <p className="mt-1">
                  {summary.restGaps > 0 ? (
                    <>
                      Descanso entre rondas: {summary.restGaps} × {restTimeMin} min ={" "}
                      <strong>{summary.restTotal} min</strong>. Total aprox.{" "}
                      <strong>
                        {summary.hours > 0 ? `${summary.hours}h ` : ""}
                        {summary.mins}min
                      </strong>
                      .
                    </>
                  ) : (
                    <>
                      Total aprox.{" "}
                      <strong>
                        {summary.hours > 0 ? `${summary.hours}h ` : ""}
                        {summary.mins}min
                      </strong>
                      .
                    </>
                  )}
                </p>
                <p className="mt-1 rounded-lg bg-white/70 px-2 py-1 text-amber-950">
                  Con <strong>{summary.configuredTotal} min</strong> disponibles entran{" "}
                  <strong>{summary.roundsThatFit} rondas</strong> /{" "}
                  <strong>{summary.matchesThatFit} partidos</strong> como máximo.
                </p>
              </section>
            )}

            <button
              type="button"
              onClick={() => void deleteTournament()}
              className="w-full rounded-lg border border-red-200 py-2 text-sm text-red-700"
            >
              Eliminar torneo
            </button>
          </>
        ) : null}
      </main>

      {tournament && (
        <div className="fixed bottom-0 left-0 right-0 border-t border-stone-200 bg-white px-4 py-3">
          <button
            type="button"
            disabled={saving}
            onClick={() => void goFixture()}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-stone-900 py-3 text-sm font-medium text-white active:bg-stone-700 disabled:bg-stone-400"
          >
            Ir al fixture
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      <TournamentLockModal
        open={pwdModal !== null}
        title={
          pwdModal?.mode === "lock"
            ? "Bloquear torneo"
            : pwdModal?.mode === "unlock"
              ? "Desbloquear torneo"
              : "Eliminar torneo bloqueado"
        }
        description={
          pwdModal?.mode === "delete"
            ? "Ingresá la contraseña para eliminar este torneo."
            : "Ingresá la contraseña para confirmar."
        }
        confirmLabel={
          pwdModal?.mode === "lock" ? "Bloquear" : pwdModal?.mode === "unlock" ? "Desbloquear" : "Eliminar"
        }
        onClose={() => setPwdModal(null)}
        onSubmit={submitPwdModal}
      />
    </div>
  );
}
