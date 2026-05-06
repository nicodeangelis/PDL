/** Solo importar desde Route Handlers / Server Components. */

export function tournamentLockPassword(): string {
  return process.env.TOURNAMENT_LOCK_PASSWORD?.trim() || "0102";
}

export function verifyTournamentLockPassword(pw: string | undefined | null): boolean {
  return Boolean(pw && pw === tournamentLockPassword());
}
