import type { MatchRow, Player, StandingRow } from "@/lib/types";

/** Mapa id -> datos mínimos del jugador (nombre/nivel). */
export function computeStandings(
  matches: MatchRow[],
  playerById: Map<string, Pick<Player, "id" | "fullName" | "level">>,
): StandingRow[] {
  const stats = new Map<
    string,
    {
      playerId: string;
      fullName: string;
      level: number;
      played: number;
      won: number;
      lost: number;
      draws: number;
      gamesFor: number;
      gamesAgainst: number;
      points: number;
    }
  >();

  for (const id of playerById.keys()) {
    const p = playerById.get(id)!;
    stats.set(id, {
      playerId: id,
      fullName: p.fullName,
      level: p.level,
      played: 0,
      won: 0,
      lost: 0,
      draws: 0,
      gamesFor: 0,
      gamesAgainst: 0,
      points: 0,
    });
  }

  for (const m of matches) {
    const s1 = parseInt(m.score1, 10);
    const s2 = parseInt(m.score2, 10);
    if (Number.isNaN(s1) || Number.isNaN(s2)) continue;

    const applyTeam = (team: [string, string], gf: number, ga: number, won: boolean, lost: boolean, draw: boolean) => {
      for (const pid of team) {
        const row = stats.get(pid);
        if (!row) continue;
        row.played++;
        row.gamesFor += gf;
        row.gamesAgainst += ga;
        if (won) {
          row.won++;
          row.points += 3;
        } else if (lost) {
          row.lost++;
        } else if (draw) {
          row.draws++;
          row.points += 1;
        }
      }
    };

    if (s1 > s2) {
      applyTeam(m.team1, s1, s2, true, false, false);
      applyTeam(m.team2, s2, s1, false, true, false);
    } else if (s1 < s2) {
      applyTeam(m.team1, s1, s2, false, true, false);
      applyTeam(m.team2, s2, s1, true, false, false);
    } else {
      applyTeam(m.team1, s1, s2, false, false, true);
      applyTeam(m.team2, s2, s1, false, false, true);
    }
  }

  /** Americano / planilla: primero juegos ganados (TOTAL), desempate diferencia (GF−GC). */
  return Array.from(stats.values()).sort((a, b) => {
    if (b.gamesFor !== a.gamesFor) return b.gamesFor - a.gamesFor;
    const diffA = a.gamesFor - a.gamesAgainst;
    const diffB = b.gamesFor - b.gamesAgainst;
    if (diffB !== diffA) return diffB - diffA;
    if (b.points !== a.points) return b.points - a.points;
    return a.fullName.localeCompare(b.fullName, "es");
  });
}
