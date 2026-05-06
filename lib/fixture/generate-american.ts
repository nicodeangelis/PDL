import type { FixtureMode, MatchRow, Player } from "@/lib/types";
import { randomUUID } from "@/lib/uuid";

export type GenerateAmericanInput = {
  players: Player[];
  courts: number;
  matchTimeMin: number;
  mode?: FixtureMode;
  targetMatches?: number;
};

export type GenerateAmericanResult =
  | { ok: true; matches: MatchRow[] }
  | { ok: false; error: string };

type Pair = {
  players: [Player, Player];
};

type CandidateMatch = {
  team1: [string, string];
  team2: [string, string];
};

function byLevelDesc(a: Player, b: Player): number {
  return b.level - a.level || a.fullName.localeCompare(b.fullName, "es") || a.id.localeCompare(b.id);
}

function pairKey(a: string, b: string): string {
  return [a, b].sort().join("|");
}

function matchPlayers(m: CandidateMatch): string[] {
  return [...m.team1, ...m.team2];
}

function makeBalancedFixedPairs(players: Player[]): Pair[] {
  const sorted = [...players].sort(byLevelDesc);
  const half = sorted.length / 2;
  const top = sorted.slice(0, half);
  const bottom = sorted.slice(half).reverse();
  return top.map((t, i) => ({ players: [t, bottom[i]] }));
}

function fixedPairRoundRobin(pairs: Pair[]): CandidateMatch[] {
  const matches: CandidateMatch[] = [];
  const rotating = [...pairs];
  const rounds = pairs.length - 1;
  const matchesPerRound = pairs.length / 2;

  for (let round = 0; round < rounds; round++) {
    for (let i = 0; i < matchesPerRound; i++) {
      const pairA = rotating[i];
      const pairB = rotating[pairs.length - 1 - i];
      matches.push({
        team1: [pairA.players[0].id, pairA.players[1].id],
        team2: [pairB.players[0].id, pairB.players[1].id],
      });
    }

    const fixed = rotating[0];
    const rest = rotating.slice(1);
    rest.unshift(rest.pop()!);
    rotating.splice(0, rotating.length, fixed, ...rest);
  }

  return matches;
}

function buildBalancedRotatingRound(players: Player[], usedPairs: Map<string, number>, round: number): Pair[] {
  const remaining = [...players].sort((a, b) => {
    const aShift = (round + players.findIndex((p) => p.id === a.id)) % players.length;
    const bShift = (round + players.findIndex((p) => p.id === b.id)) % players.length;
    return byLevelDesc(a, b) || aShift - bShift;
  });
  const pairs: Pair[] = [];

  while (remaining.length > 0) {
    const first = remaining.shift()!;
    let bestIdx = 0;
    let bestScore = Number.POSITIVE_INFINITY;

    for (let i = 0; i < remaining.length; i++) {
      const candidate = remaining[i];
      const key = pairKey(first.id, candidate.id);
      const repeatPenalty = (usedPairs.get(key) ?? 0) * 1000;
      const highHighPenalty = first.level >= 5 && candidate.level >= 5 ? 500 : 0;
      const balancePenalty = candidate.level * 20 + Math.abs(first.level - candidate.level);
      const score = repeatPenalty + highHighPenalty + balancePenalty + i / 100;
      if (score < bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }

    const [second] = remaining.splice(bestIdx, 1);
    usedPairs.set(pairKey(first.id, second.id), (usedPairs.get(pairKey(first.id, second.id)) ?? 0) + 1);
    pairs.push({ players: [first, second] });
  }

  return pairs;
}

function seededShuffle<T>(items: T[], seed: number): T[] {
  const out = [...items];
  let s = seed || 1;
  const rand = () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function buildRandomRotatingRound(players: Player[], usedPairs: Map<string, number>, round: number): Pair[] {
  const remaining = seededShuffle(players, Date.now() + round * 97);
  const pairs: Pair[] = [];

  while (remaining.length > 0) {
    const first = remaining.shift()!;
    let bestIdx = 0;
    let bestScore = Number.POSITIVE_INFINITY;
    for (let i = 0; i < remaining.length; i++) {
      const candidate = remaining[i];
      const score = (usedPairs.get(pairKey(first.id, candidate.id)) ?? 0) * 1000 + i;
      if (score < bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }
    const [second] = remaining.splice(bestIdx, 1);
    usedPairs.set(pairKey(first.id, second.id), (usedPairs.get(pairKey(first.id, second.id)) ?? 0) + 1);
    pairs.push({ players: [first, second] });
  }

  return pairs;
}

function pairTeamsIntoMatches(pairs: Pair[]): CandidateMatch[] {
  const sorted = [...pairs].sort((a, b) => {
    const aLevel = a.players[0].level + a.players[1].level;
    const bLevel = b.players[0].level + b.players[1].level;
    return bLevel - aLevel;
  });

  const matches: CandidateMatch[] = [];
  while (sorted.length >= 2) {
    const strong = sorted.shift()!;
    const weak = sorted.pop()!;
    matches.push({
      team1: [strong.players[0].id, strong.players[1].id],
      team2: [weak.players[0].id, weak.players[1].id],
    });
  }
  return matches;
}

function rotatingMatches(
  players: Player[],
  mode: "rotating_balanced" | "rotating_random",
  targetMatches?: number,
): CandidateMatch[] {
  const matchesPerRound = players.length / 4;
  const baseRounds = players.length / 2 - 1;
  const extraRounds =
    targetMatches && targetMatches > 0 ? Math.ceil(targetMatches / Math.max(1, matchesPerRound)) : 0;
  const rounds = Math.max(baseRounds, extraRounds);
  const usedPairs = new Map<string, number>();
  const matches: CandidateMatch[] = [];

  for (let round = 0; round < rounds; round++) {
    const pairs =
      mode === "rotating_balanced"
        ? buildBalancedRotatingRound(players, usedPairs, round)
        : buildRandomRotatingRound(players, usedPairs, round);
    matches.push(...pairTeamsIntoMatches(pairs));
  }

  return matches;
}

function scheduleIntoCourtSlots(candidates: CandidateMatch[], courts: number, matchTimeMin: number): MatchRow[] {
  const c = Math.max(1, courts);
  const indexed = candidates.map((match, idx) => ({ match, idx }));
  const memo = new Set<string>();

  const isConflictFree = (slot: typeof indexed) => {
    const ids = slot.flatMap(({ match }) => matchPlayers(match));
    return new Set(ids).size === ids.length;
  };

  const combinations = (items: typeof indexed, size: number) => {
    const out: (typeof indexed)[] = [];
    const visit = (start: number, picked: typeof indexed) => {
      if (picked.length === size) {
        if (isConflictFree(picked)) out.push(picked);
        return;
      }
      for (let i = start; i < items.length; i++) {
        visit(i + 1, [...picked, items[i]]);
      }
    };
    visit(0, []);
    return out;
  };

  const search = (items: typeof indexed): (typeof indexed)[] | null => {
    if (items.length === 0) return [];
    const key = items.map((item) => item.idx).join(",");
    if (memo.has(key)) return null;

    const target = Math.min(c, items.length);
    for (let size = target; size >= 1; size--) {
      const slots = combinations(items, size);
      for (const slot of slots) {
        const used = new Set(slot.map((item) => item.idx));
        const rest = items.filter((item) => !used.has(item.idx));
        const tail = search(rest);
        if (tail) return [slot, ...tail];
      }
      if (size === target && items.length > c) continue;
      break;
    }
    memo.add(key);
    return null;
  };

  const slots = search(indexed) ?? indexed.map((item) => [item]);
  const scheduled = slots.flatMap((slot) => slot.map((item, courtIdx) => ({ ...item.match, court: courtIdx + 1 })));

  return scheduled.map((m, order) => ({
    id: `m-${randomUUID()}`,
    team1: m.team1,
    team2: m.team2,
    score1: "",
    score2: "",
    court: m.court,
    duration: matchTimeMin,
    order,
  }));
}

export function generateAmericanFixture(input: GenerateAmericanInput): GenerateAmericanResult {
  const { players, courts, matchTimeMin, mode = "rotating_balanced", targetMatches } = input;
  if (players.length < 4) {
    return { ok: false, error: "Necesitás al menos 4 jugadores" };
  }
  if (players.length % 4 !== 0) {
    return { ok: false, error: "Necesitás un múltiplo de 4 jugadores (4, 8, 12...)" };
  }
  const candidates =
    mode === "fixed_balanced"
      ? fixedPairRoundRobin(makeBalancedFixedPairs(players))
      : rotatingMatches([...players].sort(byLevelDesc), mode, targetMatches);

  const scheduled = scheduleIntoCourtSlots(candidates, courts, matchTimeMin);
  const limited =
    targetMatches && targetMatches > 0
      ? scheduled.slice(0, targetMatches).map((m, order) => ({ ...m, order }))
      : scheduled;
  return { ok: true, matches: limited };
}
