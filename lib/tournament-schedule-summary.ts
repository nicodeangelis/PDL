/**
 * Tiempo de agenda del club: con varias canchas, en cada ronda los partidos
 * de esa ronda corren en paralelo (una ronda ≈ matchTimeMin, no la suma de todos).
 */
export function computeScheduleMinutes(
  numMatches: number,
  courts: number,
  matchTimeMin: number,
  restTimeMin: number,
) {
  const c = Math.max(1, courts);
  const rounds = Math.ceil(numMatches / c);
  const playMin = rounds * matchTimeMin;
  const restGaps = Math.max(0, rounds - 1);
  const restTotal = restGaps * restTimeMin;
  const totalMin = playMin + restTotal;
  return { rounds, playMin, restGaps, restTotal, totalMin };
}

export function computeRoundsThatFit(
  totalTimeMin: number | undefined,
  matchTimeMin: number,
  restTimeMin: number,
) {
  const total = Math.max(0, Number(totalTimeMin) || 0);
  const match = Math.max(1, Number(matchTimeMin) || 1);
  const rest = Math.max(0, Number(restTimeMin) || 0);
  if (total < match) return 0;
  return Math.floor((total + rest) / (match + rest));
}
