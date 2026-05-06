"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Calendar, ChevronLeft, Plus, RefreshCw, Trophy } from "lucide-react";
import type { Tournament } from "@/lib/types";

export default function TorneosPage() {
  const [list, setList] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    setLoading(true);
    try {
      const r = await fetch("/api/tournaments");
      if (!r.ok) throw new Error("fail");
      setList(await r.json());
    } catch {
      setErr("No se pudieron cargar los torneos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <header className="sticky top-0 z-10 border-b border-stone-200 bg-white px-3 py-2">
        <div className="flex items-center justify-between">
          <Link href="/" className="p-1 text-stone-500 active:text-stone-900">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div className="flex items-center gap-2 text-sm font-medium">
            <Trophy className="h-4 w-4 text-amber-600" />
            Torneos
          </div>
          <button type="button" onClick={() => void load()} className="p-1 text-stone-500" aria-label="Actualizar">
            <RefreshCw className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </header>

      <main className="space-y-4 px-4 py-4 pb-24">
        {err && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">{err}</p>
        )}

        <Link
          href="/torneos/nuevo"
          className="flex items-center justify-center gap-2 rounded-xl bg-stone-900 py-3 text-sm font-medium text-white active:bg-stone-700"
        >
          <Plus className="h-4 w-4" />
          Nuevo torneo
        </Link>

        {loading && list.length === 0 ? (
          <p className="py-8 text-center text-xs text-stone-400">Cargando…</p>
        ) : list.length === 0 ? (
          <p className="py-8 text-center text-xs text-stone-400">No hay torneos todavía</p>
        ) : (
          <ul className="space-y-2">
            {list.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/torneos/${t.id}`}
                  className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3 active:bg-stone-50"
                >
                  <Calendar className="h-5 w-5 shrink-0 text-stone-400" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{t.name || "Torneo sin nombre"}</p>
                    <p className="text-xs text-stone-500">
                      {new Date(t.dateISO).toLocaleDateString("es-AR")} · {t.participantIds.length} jugadores
                    </p>
                  </div>
                  <span className="text-xs text-stone-400">→</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
