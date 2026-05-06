import { computeStandings } from "@/lib/standings/compute-standings";
import type {
  CareerStats,
  HistoryEntry,
  MatchRow,
  Player,
  Tournament,
} from "@/lib/types";
import { K } from "@/lib/kv/keys";
import { kv } from "@vercel/kv";

const HISTORY_LIMIT = 30;

function emptyCareer(): CareerStats {
  return {
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
}

function standingToCareerDelta(s: {
  played: number;
  won: number;
  lost: number;
  draws: number;
  points: number;
  gamesFor: number;
  gamesAgainst: number;
}): Partial<CareerStats> {
  return {
    matchesPlayed: s.played,
    wins: s.won,
    losses: s.lost,
    draws: s.draws,
    points: s.points,
    gamesFor: s.gamesFor,
    gamesAgainst: s.gamesAgainst,
  };
}

/**
 * Recalcula carrera e historial global leyendo todos los torneos.
 * Pensado para volúmenes chicos (club); mantiene consistencia al editar resultados.
 */
export async function recomputeAllPlayerAggregates(
  store: typeof kv,
  allPlayers: Player[],
): Promise<void> {
  const playerById = new Map(allPlayers.map((p) => [p.id, p]));
  const tournamentIds = (await store.get<string[]>(K.tournamentsIndex)) ?? [];

  const careerAcc = new Map<string, CareerStats>();
  const historyAcc = new Map<string, HistoryEntry[]>();

  for (const p of allPlayers) {
    careerAcc.set(p.id, emptyCareer());
    historyAcc.set(p.id, []);
  }

  const tournamentsMeta: { id: string; meta: Tournament; matches: MatchRow[] }[] = [];

  for (const tid of tournamentIds) {
    const meta = await store.get<Tournament>(K.tournament(tid));
    const matches = (await store.get<MatchRow[]>(K.tournamentMatches(tid))) ?? [];
    if (!meta) continue;
    tournamentsMeta.push({ id: tid, meta, matches });
  }

  tournamentsMeta.sort((a, b) => new Date(a.meta.dateISO).getTime() - new Date(b.meta.dateISO).getTime());

  for (const { id: tid, meta, matches } of tournamentsMeta) {
    const pmap = new Map<string, Pick<Player, "id" | "fullName" | "level">>();
    for (const pid of meta.participantIds) {
      const pl = playerById.get(pid);
      if (pl) {
        pmap.set(pid, { id: pl.id, fullName: pl.fullName, level: pl.level });
      } else {
        pmap.set(pid, { id: pid, fullName: "Jugador eliminado", level: 0 });
      }
    }

    const standings = computeStandings(matches, pmap);
    const rankByPlayer = new Map<string, { rank: number; row: (typeof standings)[0] }>();
    standings.forEach((row, idx) => {
      rankByPlayer.set(row.playerId, { rank: idx + 1, row });
    });

    const hasAnyScore = matches.some((m) => {
      const a = parseInt(m.score1, 10);
      const b = parseInt(m.score2, 10);
      return !Number.isNaN(a) && !Number.isNaN(b);
    });

    for (const pid of meta.participantIds) {
      const career = careerAcc.get(pid);
      if (!career) continue;

      career.tournamentsPlayed += 1;
      if (hasAnyScore) career.lastTournamentId = tid;

      const st = rankByPlayer.get(pid)?.row;
      if (st) {
        const d = standingToCareerDelta(st);
        career.matchesPlayed += d.matchesPlayed ?? 0;
        career.wins += d.wins ?? 0;
        career.losses += d.losses ?? 0;
        career.draws += d.draws ?? 0;
        career.points += d.points ?? 0;
        career.gamesFor += d.gamesFor ?? 0;
        career.gamesAgainst += d.gamesAgainst ?? 0;
      }

      const r = rankByPlayer.get(pid);
      const hist = historyAcc.get(pid) ?? [];
      hist.push({
        tournamentId: tid,
        dateISO: meta.dateISO,
        name: meta.name,
        rank: r?.rank ?? standings.length,
        pointsInTournament: r?.row.points ?? 0,
        played: r?.row.played ?? 0,
        won: r?.row.won ?? 0,
        lost: r?.row.lost ?? 0,
        draws: r?.row.draws ?? 0,
      });
      historyAcc.set(pid, hist);
    }
  }

  const pipeline = store.pipeline();
  for (const p of allPlayers) {
    const c = careerAcc.get(p.id) ?? emptyCareer();
    pipeline.set(K.playerCareer(p.id), c);
    const h = (historyAcc.get(p.id) ?? []).slice(-HISTORY_LIMIT);
    pipeline.set(K.playerHistory(p.id), h);
  }
  await pipeline.exec();
}
