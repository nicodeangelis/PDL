import Link from "next/link";
import { Trophy, Users } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <header className="sticky top-0 z-10 border-b border-stone-200 bg-white px-4 py-3">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-amber-600" />
          <h1 className="text-base font-medium">Torneo de pádel</h1>
        </div>
      </header>
      <main className="space-y-3 px-4 py-6">
        <p className="text-sm text-stone-600">
          Jugadores, torneos y fixture estilo americano. Mobile first.
        </p>
        <nav className="flex flex-col gap-2">
          <Link
            href="/jugadores"
            className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white px-4 py-4 text-sm font-medium active:bg-stone-50"
          >
            <Users className="h-5 w-5 text-stone-500" />
            Jugadores
          </Link>
          <Link
            href="/torneos"
            className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white px-4 py-4 text-sm font-medium active:bg-stone-50"
          >
            <Trophy className="h-5 w-5 text-amber-600" />
            Torneos
          </Link>
        </nav>
      </main>
    </div>
  );
}
