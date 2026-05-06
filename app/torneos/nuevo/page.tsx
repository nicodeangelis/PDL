"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function NuevoTorneoPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [dateISO, setDateISO] = useState(() => new Date().toISOString().slice(0, 10));
  const [courts, setCourts] = useState(2);
  const [matchTimeMin, setMatchTimeMin] = useState(15);
  const [restTimeMin, setRestTimeMin] = useState(5);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setErr(null);
    setSaving(true);
    try {
      const r = await fetch("/api/tournaments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || undefined,
          dateISO: new Date(dateISO + "T12:00:00").toISOString(),
          courts,
          matchTimeMin,
          restTimeMin,
          participantIds: [],
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setErr(String(j.error ?? "Error"));
        return;
      }
      router.push(`/torneos/${j.id}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <header className="sticky top-0 z-10 border-b border-stone-200 bg-white px-3 py-2">
        <div className="flex items-center gap-2">
          <Link href="/torneos" className="p-1 text-stone-500">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-sm font-medium">Nuevo torneo</h1>
        </div>
      </header>

      <main className="space-y-5 px-4 py-4 pb-28">
        {err && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">{err}</p>
        )}

        <section className="rounded-xl border border-stone-200 bg-white p-4">
          <label className="mb-3 block text-sm font-medium">Nombre (opcional)</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-stone-900 focus:outline-none"
            placeholder="Ej. Americano viernes"
          />
        </section>

        <section className="rounded-xl border border-stone-200 bg-white p-4">
          <label className="mb-3 block text-sm font-medium">Fecha</label>
          <input
            type="date"
            value={dateISO}
            onChange={(e) => setDateISO(e.target.value)}
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-stone-900 focus:outline-none"
          />
        </section>

        <section className="rounded-xl border border-stone-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-medium">Variables del partido</h2>
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
        </section>
      </main>

      <div className="fixed bottom-0 left-0 right-0 border-t border-stone-200 bg-white px-4 py-3">
        <button
          type="button"
          disabled={saving}
          onClick={() => void submit()}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-stone-900 py-3 text-sm font-medium text-white disabled:bg-stone-300 active:bg-stone-700"
        >
          Crear y elegir jugadores
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
