// Calendar dates are YYYY-MM-DD strings; datetimes are UTC "YYYY-MM-DD HH:mm:ss"
// as stored in the database.

export const DAY_MS = 24 * 60 * 60 * 1000;

export const dateMs = (date: string) => Date.parse(`${date}T00:00:00Z`);
const toDate = (ms: number) => new Date(ms).toISOString().slice(0, 10);
export const addDays = (date: string, days: number) => toDate(dateMs(date) + days * DAY_MS);
export const toDatetime = (ms: number) => new Date(ms).toISOString().slice(0, 19).replace('T', ' ');

/** Inclusive number of calendar days from dateFrom to dateTo */
export function countDays(dateFrom: string, dateTo: string) {
  return Math.round((dateMs(dateTo) - dateMs(dateFrom)) / DAY_MS) + 1;
}

/** The canonical IANA name, or null when the zone is unknown */
export function resolveTimezone(timezone: string) {
  try {
    return new Intl.DateTimeFormat('en-US', { timeZone: timezone }).resolvedOptions().timeZone;
  } catch {
    return null;
  }
}

const formatters = new Map<string, Intl.DateTimeFormat>();

function getFormatter(timezone: string) {
  let formatter = formatters.get(timezone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    });
    formatters.set(timezone, formatter);
  }
  return formatter;
}

// The zone's wall clock at the instant, as if it were UTC
function wallClock(instant: number, timezone: string) {
  const parts = getFormatter(timezone).formatToParts(instant);
  const part = (type: string) => Number(parts.find((p) => p.type === type)!.value);
  return Date.UTC(
    part('year'),
    part('month') - 1,
    part('day'),
    part('hour'),
    part('minute'),
    part('second'),
  );
}

const zoneOffset = (instant: number, timezone: string) =>
  wallClock(instant, timezone) - Math.floor(instant / 1000) * 1000;

/** The local calendar date of a UTC instant */
export function localDateOf(instant: number, timezone: string) {
  return toDate(wallClock(instant, timezone));
}

/**
 * UTC instant of the date's first local instant. Where DST skips midnight that
 * is the transition; where it repeats, the first.
 */
export function startOfLocalDay(date: string, timezone: string) {
  const midnight = dateMs(date);
  return Math.min(
    ...[midnight - DAY_MS, midnight + DAY_MS]
      .map((probe) => midnight - zoneOffset(probe, timezone))
      .filter((candidate) => candidate + zoneOffset(candidate, timezone) >= midnight),
  );
}

/** Half-open UTC bounds of inclusive local dates */
export function localDateBounds(dateFrom: string, dateTo: string, timezone: string) {
  return {
    from: toDatetime(startOfLocalDay(dateFrom, timezone)),
    to: toDatetime(startOfLocalDay(addDays(dateTo, 1), timezone)),
  };
}
