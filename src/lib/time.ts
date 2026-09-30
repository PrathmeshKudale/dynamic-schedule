// Timezone-aware helpers. `tz` is the browser's getTimezoneOffset() (minutes, UTC - local).
export const MIN = 60_000;
export const HOUR = 60 * MIN;
export const DAY = 24 * HOUR;

export function toLocal(ms: number, tz: number) {
  return ms - tz * MIN;
}
export function fromLocal(localMs: number, tz: number) {
  return localMs + tz * MIN;
}
/** UTC ms of the local midnight that contains `ms`. */
export function localDayStart(ms: number, tz: number) {
  const d = new Date(toLocal(ms, tz));
  d.setUTCHours(0, 0, 0, 0);
  return fromLocal(d.getTime(), tz);
}
export function localMinutes(ms: number, tz: number) {
  const d = new Date(toLocal(ms, tz));
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}
export function localDow(ms: number, tz: number) {
  return new Date(toLocal(ms, tz)).getUTCDay();
}
export function parseHM(s: string) {
  const [h, m] = s.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}
/** UTC ms for a local YYYY-MM-DD + HH:mm */
export function localDateTime(date: string, hm: string, tz: number) {
  const [y, mo, d] = date.split("-").map(Number);
  const mins = parseHM(hm);
  return fromLocal(Date.UTC(y, mo - 1, d, 0, 0, 0) + mins * MIN, tz);
}
export function localDateStr(ms: number, tz: number) {
  return new Date(toLocal(ms, tz)).toISOString().slice(0, 10);
}
/** Next local occurrence of weekday `dow` at least `minAhead` days from today. */
export function nextDow(now: number, tz: number, dow: number, minAhead = 1) {
  const base = localDayStart(now, tz);
  for (let i = minAhead; i < minAhead + 8; i++) {
    const ds = base + i * DAY;
    if (localDow(ds, tz) === dow) return ds;
  }
  return base + minAhead * DAY;
}
export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function fmtTime(ms: number | string) {
  return new Date(ms).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}
export function fmtDay(ms: number | string) {
  return new Date(ms).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}
export function fmtDayTime(ms: number | string) {
  const d = new Date(ms);
  const today = new Date();
  const tomorrow = new Date(Date.now() + DAY);
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  const day = same(d, today)
    ? "Today"
    : same(d, tomorrow)
      ? "Tomorrow"
      : d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
  return `${day} ${fmtTime(ms)}`;
}
export function fmtDuration(mins: number) {
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  if (!h) return `${m}m`;
  return m ? `${h}h ${m}m` : `${h}h`;
}
