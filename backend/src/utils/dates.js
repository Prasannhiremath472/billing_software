// The shop operates in a fixed local timezone (default IST, UTC+05:30). Timestamps are stored in UTC;
// "business day" boundaries (daily closing, date-only fields) use this offset.
const OFFSET_MIN = Number(process.env.STORE_UTC_OFFSET_MINUTES ?? 330);

/** YYYY-MM-DD of the business day that contains `date`. */
export function businessDate(date = new Date()) {
  return new Date(date.getTime() + OFFSET_MIN * 60_000).toISOString().slice(0, 10);
}

/** UTC [start, end) of a business day, as MySQL DATETIME strings. */
export function businessDayRangeUtc(ymd) {
  const startMs = Date.parse(`${ymd}T00:00:00Z`) - OFFSET_MIN * 60_000;
  const fmt = ms => new Date(ms).toISOString().replace('T', ' ').replace('Z', '');
  return [fmt(startMs), fmt(startMs + 86_400_000)];
}

export function yymm(date = new Date()) {
  const local = new Date(date.getTime() + OFFSET_MIN * 60_000).toISOString();
  return `${local.slice(2, 4)}${local.slice(5, 7)}`;
}
