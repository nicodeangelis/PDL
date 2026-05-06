import type { MatchRow, Player } from "@/lib/types";
import { randomUUID } from "@/lib/uuid";

export type GenerateAmericanInput = {
  players: Player[];
  courts: number;
  matchTimeMin: number;
};

export type GenerateAmericanResult =
  | { ok: true; matches: MatchRow[] }
  | { ok: false; error: string };

/**
 * Misma lógica que torneo-padel.jsx: parejas por nivel (mejor + peor mitad),
 * round-robin entre parejas, cancha = índice % courts + 1.
 */
export function generateAmericanFixture(input: GenerateAmericanInput): GenerateAmericanResult {
  const { players, courts, matchTimeMin } = input;
  if (players.length < 4) {
    return { ok: false, error: "Necesitás al menos 4 jugadores" };
  }
  if (players.length % 4 !== 0) {
    return { ok: false, error: "Necesitás un múltiplo de 4 jugadores (4, 8, 12...)" };
  }
  const c = Math.max(1, courts);

  const sorted = [...players].sort((a, b) => b.level - a.level);
  const half = sorted.length / 2;
  const top = sorted.slice(0, half);
  const bottom = sorted.slice(half).reverse();

  const pairs = top.map((t, i) => ({
    id: `p${i}`,
    players: [t, bottom[i]] as [Player, Player],
    level: t.level + bottom[i].level,
  }));

  const generated: Omit<MatchRow, "order">[] = [];
  for (let i = 0; i < pairs.length; i++) {
    for (let j = i + 1; j < pairs.length; j++) {
      const team1: [string, string] = [pairs[i].players[0].id, pairs[i].players[1].id];
      const team2: [string, string] = [pairs[j].players[0].id, pairs[j].players[1].id];
      generated.push({
        id: `m-${randomUUID()}`,
        team1,
        team2,
        score1: "",
        score2: "",
        court: (generated.length % c) + 1,
        duration: matchTimeMin,
      });
    }
  }

  const matches: MatchRow[] = generated.map((m, order) => ({ ...m, order }));

  return { ok: true, matches };
}
