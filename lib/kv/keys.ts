export const K = {
  playersIndex: "players:index",
  tournamentsIndex: "tournaments:index",
  player: (id: string) => `player:${id}`,
  playerCareer: (id: string) => `player:${id}:career`,
  playerHistory: (id: string) => `player:${id}:history`,
  tournament: (id: string) => `tournament:${id}`,
  tournamentMatches: (id: string) => `tournament:${id}:matches`,
} as const;
