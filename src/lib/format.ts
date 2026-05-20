export function formatUtcDateTime(isoLike: string): string {
  const d = new Date(isoLike);
  if (Number.isNaN(d.getTime())) return isoLike;
  return d.toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
}