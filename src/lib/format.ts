/** Display formatting helpers. All output is locale-pinned so snapshots are stable. */

const MONTHS = [
  'JAN',
  'FEB',
  'MAR',
  'APR',
  'MAY',
  'JUN',
  'JUL',
  'AUG',
  'SEP',
  'OCT',
  'NOV',
  'DEC',
] as const;

function pad(value: number, width = 2): string {
  return value.toString().padStart(width, '0');
}

/** `2026-04-18T09:41:00.000Z` -> `18 APR` */
export function formatDayMonth(iso: string): string {
  const d = new Date(iso);
  const month = MONTHS[d.getUTCMonth()] ?? '???';
  return `${pad(d.getUTCDate())} ${month}`;
}

/** `2026-04-18T09:41:00.000Z` -> `18 APR 09:41` */
export function formatStamp(iso: string): string {
  const d = new Date(iso);
  return `${pad(d.getUTCDate())} ${MONTHS[d.getUTCMonth()] ?? '???'} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

/** `2026-04-18T09:41:00.000Z` -> `09:41:07` */
export function formatClock(iso: string): string {
  const d = new Date(iso);
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}

/** `2026-04-18T09:41:00.000Z` -> `2026-04-18` */
export function toDateInputValue(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

/** `2026-04-18T09:41:00.000Z` -> `09:41` */
export function formatShortTime(iso: string): string {
  const d = new Date(iso);
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

/** `2026-04-18T09:41:00.000Z` -> `2026-04-18 09:41 UTC` */
export function formatFullStamp(iso: string): string {
  return `${toDateInputValue(iso)} ${formatShortTime(iso)} UTC`;
}

/** Thousands separators, e.g. `12480`. */
export function formatCount(value: number): string {
  return value.toLocaleString('en-US');
}

/** Clamped percentage with no decimals, e.g. `94`. */
export function formatPercent(value: number): string {
  return `${Math.round(value)}`;
}

/** `9440` -> `9.4k` for tight header slots. */
export function formatCompact(value: number): string {
  if (value < 1000) return String(value);
  const k = value / 1000;
  return `${k >= 10 ? Math.round(k) : k.toFixed(1)}k`;
}

/** Human duration: `90` -> `01:30`. */
export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${pad(m)}:${pad(s)}`;
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return count === 1 ? singular : plural;
}

/** Distance between two ISO dates rendered as `18 DAYS`. */
export function formatSpanDays(fromIso: string, toIso: string): string {
  const ms = new Date(toIso).getTime() - new Date(fromIso).getTime();
  const days = Math.max(1, Math.round(ms / 86_400_000));
  return `${days} ${pluralize(days, 'day')}`.toUpperCase();
}
