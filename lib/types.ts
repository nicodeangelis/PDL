export type Player = {
  id: string;
  fullName: string;
  level: number;
  createdAt: string;
};

export type Tournament = {
  id: string;
  name?: string;
  dateISO: string;
  courts: number;
  matchTimeMin: number;
  restTimeMin: number;
  participantIds: string[];
  createdAt: string;
};

export type MatchRow = {
  id: string;
  order: number;
  team1: [string, string];
  team2: [string, string];
  score1: string;
  score2: string;
  court: number;
  duration: number;
};

export type CareerStats = {
  tournamentsPlayed: number;
  matchesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  points: number;
  gamesFor: number;
  gamesAgainst: number;
  lastTournamentId: string | null;
};

export type HistoryEntry = {
  tournamentId: string;
  dateISO: string;
  name?: string;
  rank: number;
  pointsInTournament: number;
  played: number;
  won: number;
  lost: number;
  draws: number;
};

export type StandingRow = {
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
};
