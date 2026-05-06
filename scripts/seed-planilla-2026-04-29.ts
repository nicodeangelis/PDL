import { config } from "dotenv";

config({ path: ".env.local" });
config();

function ensureStoreEnv(): void {
  const tcp = process.env.REDIS_URL?.trim();
  const rest =
    process.env.KV_REST_API_URL?.trim() && process.env.KV_REST_API_TOKEN?.trim();
  if (!tcp && !rest) {
    console.error(
      "No hay REDIS_URL ni KV_REST_* en el entorno.\n" +
        "Si `vercel env pull` dejó REDIS_URL vacío, pegá la URL redis://… desde Redis Cloud / Vercel en .env.local o exportala antes de correr el script.",
    );
    process.exit(1);
  }
}

/**
 * Carga jugadores + torneo del 29/04/2026 + partidos inferidos desde la planilla.
 *
 * Uso:
 *   REDIS_URL="redis://..." npx tsx scripts/seed-planilla-2026-04-29.ts
 *
 * Nota: cada socio recibe el mismo juegos a favor/en contra del equipo en cada partido;
 * puede diferir un poco de la columna TOTAL manuscrita si en la planilla repartían distinto.
 */

import type { MatchRow, Player, Tournament } from "../lib/types";
import { savePlayer } from "../lib/kv/players";
import { saveMatches, saveTournament } from "../lib/kv/tournaments";
import { syncPlayerAggregates } from "../lib/career/sync";

const TOURNAMENT_ID = "seed-20260429-planilla";
const DATE_ISO = "2026-04-29T12:00:00.000Z";

const Id = {
  santiago: "seed20260429-santiago",
  cristian: "seed20260429-cristian",
  guille: "seed20260429-guille",
  pablo: "seed20260429-pablo",
  nico: "seed20260429-nico",
  diego: "seed20260429-diego",
  wally: "seed20260429-wally",
  mati: "seed20260429-mati",
  mariano: "seed20260429-mariano",
  ale: "seed20260429-ale",
} as const;

const PLAYERS_META: { id: string; fullName: string; level: number }[] = [
  { id: Id.santiago, fullName: "Santiago", level: 5 },
  { id: Id.cristian, fullName: "Cristián", level: 5 },
  { id: Id.guille, fullName: "Guille", level: 3 },
  { id: Id.pablo, fullName: "Pablo", level: 3 },
  { id: Id.nico, fullName: "Nico", level: 3 },
  { id: Id.diego, fullName: "Diego", level: 3 },
  { id: Id.wally, fullName: "Wally", level: 3 },
  { id: Id.mati, fullName: "Mati", level: 3 },
  { id: Id.mariano, fullName: "Mariano", level: 3 },
  { id: Id.ale, fullName: "Ale", level: 3 },
];

function row(
  order: number,
  court: number,
  a: string,
  b: string,
  c: string,
  d: string,
  s1: number,
  s2: number,
): MatchRow {
  return {
    id: `seed-m-${TOURNAMENT_ID}-${order}`,
    order,
    team1: [a, b],
    team2: [c, d],
    score1: String(s1),
    score2: String(s2),
    court,
    duration: 15,
  };
}

function buildMatches(): MatchRow[] {
  const out: MatchRow[] = [];
  let order = 0;
  const c = (i: number) => (i % 2) + 1;

  // R1
  out.push(
    row(order++, c(0), Id.santiago, Id.cristian, Id.guille, Id.pablo, 7, 2),
    row(order++, c(1), Id.nico, Id.diego, Id.wally, Id.mati, 3, 4),
  );
  // R2
  out.push(
    row(order++, c(0), Id.mariano, Id.ale, Id.santiago, Id.guille, 0, 8),
    row(order++, c(1), Id.cristian, Id.pablo, Id.nico, Id.wally, 4, 4),
  );
  // R3
  out.push(
    row(order++, c(0), Id.diego, Id.mati, Id.mariano, Id.cristian, 5, 3),
    row(order++, c(1), Id.ale, Id.santiago, Id.guille, Id.wally, 1, 7),
  );
  // R4
  out.push(
    row(order++, c(0), Id.nico, Id.pablo, Id.diego, Id.ale, 3, 3),
    row(order++, c(1), Id.mati, Id.mariano, Id.santiago, Id.cristian, 0, 10),
  );
  // R5
  out.push(
    row(order++, c(0), Id.guille, Id.wally, Id.nico, Id.mati, 6, 3),
    row(order++, c(1), Id.pablo, Id.diego, Id.mariano, Id.ale, 7, 4),
  );

  return out;
}

async function main() {
  ensureStoreEnv();

  const now = new Date().toISOString();

  for (const meta of PLAYERS_META) {
    const player: Player = {
      id: meta.id,
      fullName: meta.fullName,
      level: meta.level,
      createdAt: now,
    };
    await savePlayer(player);
  }

  const tournament: Tournament = {
    id: TOURNAMENT_ID,
    name: "Americano 29/04/2026 (planilla)",
    dateISO: DATE_ISO,
    courts: 2,
    matchTimeMin: 15,
    restTimeMin: 5,
    totalTimeMin: 85,
    fixtureMode: "fixed_balanced",
    participantIds: PLAYERS_META.map((p) => p.id),
    createdAt: now,
  };

  await saveTournament(tournament);
  await saveMatches(TOURNAMENT_ID, buildMatches());
  await syncPlayerAggregates();

  console.log("OK — torneo", TOURNAMENT_ID, "| jugadores:", PLAYERS_META.length);
  console.log("Abrí en la app: /torneos/" + TOURNAMENT_ID + "/tabla");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
