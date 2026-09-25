const WEEK_IN_MILLISECONDS = 7 * 24 * 60 * 60 * 1000;

export function getPhaseTwoStart(completedAt?: string): number | null {
  if (!completedAt) return null;
  const timestamp = Date.parse(completedAt.includes('T') ? completedAt : `${completedAt.replace(' ', 'T')}Z`);
  return Number.isFinite(timestamp) ? timestamp + WEEK_IN_MILLISECONDS : null;
}
