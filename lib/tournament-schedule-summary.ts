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
