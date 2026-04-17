/**
 * Single source of truth for UTC ↔ local time conversion.
 * All other UI code must go through these helpers — do not
 * instantiate Date conversions inline elsewhere.
 */

/** Convert a <input type="datetime-local"> value to a UTC ISO string. */
export function toUtcIso(localDateTime: string): string {
  if (!localDateTime) return '';
  const d = new Date(localDateTime);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString();
}

/** Format a UTC ISO string for display in the user's locale and timezone. */
export function formatLocal(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(d);
}

/** Format a UTC ISO string as the exact UTC value for hint text. */
export function formatUtc(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.toISOString().replace('T', ' ').substring(0, 16)} UTC`;
}

/** Render a UTC ISO string as the value for a datetime-local input. */
export function toLocalInputValue(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}`
  );
}
