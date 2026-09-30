import { Temporal } from 'temporal-polyfill';

const pad = (value: number) => String(value).padStart(2, '0');

function parseInstant(value?: string | null) {
  if (!value) {
    return null;
  }
  try {
    return Temporal.Instant.from(value);
  } catch {
    return null;
  }
}

function formatUtc(instant: Temporal.Instant, milliseconds: boolean) {
  const date = instant.toZonedDateTimeISO('UTC');
  const month = date.toLocaleString('en-US', { month: 'short' });
  const fraction = milliseconds ? `.${String(date.millisecond).padStart(3, '0')}` : '';
  return `${pad(date.day)} ${month}, ${date.year}, ${pad(date.hour)}:${pad(date.minute)}:${pad(date.second)}${fraction}`;
}

export function formatDebugDate(value?: string | null, milliseconds = false) {
  const instant = parseInstant(value);
  return instant ? `${formatUtc(instant, milliseconds)} UTC` : 'N/A';
}

/** Compact UTC date and time for tables; callers expose the full timestamp on hover. */
export function formatSyncTime(
  value?: string | null,
  { year = false, timezone = 'UTC' }: { year?: boolean; timezone?: string } = {},
) {
  const instant = parseInstant(value);
  if (!instant) {
    return null;
  }
  const date = instant.toZonedDateTimeISO(timezone);
  const month = date.toLocaleString('en-US', { month: 'short' });
  return {
    date: year ? `${pad(date.day)} ${month} ${date.year}` : `${pad(date.day)} ${month}`,
    time: `${pad(date.hour)}:${pad(date.minute)}:${pad(date.second)}`,
    offsetNanoseconds: date.offsetNanoseconds,
  };
}

export function secondsBetween(from?: string | null, to?: string | null) {
  const begin = parseInstant(from);
  const end = parseInstant(to);
  if (!begin || !end) {
    return null;
  }
  return begin.until(end).total({ unit: 'seconds' });
}

export function formatPublishedDate(value: string, timezone: string) {
  const instant = parseInstant(value);
  if (!instant) {
    return null;
  }
  const date = instant.toZonedDateTimeISO(timezone);
  const month = date.toLocaleString('en-US', { month: 'short' });
  return `${date.day} ${month} ${date.year} at ${pad(date.hour)}:${pad(date.minute)}`;
}

export function defaultRefetchRange(createdAt?: string | null, now = Temporal.Now.instant()) {
  const begin = parseInstant(createdAt) ?? now;
  const weekAfterCreation = begin.add({ hours: 7 * 24 });
  const hourAgo = now.subtract({ hours: 1 });
  const cappedEnd =
    Temporal.Instant.compare(weekAfterCreation, hourAgo) < 0 ? weekAfterCreation : hourAgo;
  // An email sent within the last hour would otherwise end before it begins.
  const end = Temporal.Instant.compare(cappedEnd, begin) > 0 ? cappedEnd : now;
  const inputValue = (instant: Temporal.Instant) =>
    instant.toZonedDateTimeISO('UTC').toPlainDateTime().toString({ smallestUnit: 'minute' });
  return { begin: inputValue(begin), end: inputValue(end) };
}

export function refetchRangeToUtc(range: { begin: string; end: string }) {
  const begin = Temporal.PlainDateTime.from(range.begin).toZonedDateTime('UTC').toInstant();
  const end = Temporal.PlainDateTime.from(range.end).toZonedDateTime('UTC').toInstant();
  if (Temporal.Instant.compare(begin, end) >= 0) {
    throw new Error('Choose a begin date before the end date.');
  }
  return {
    begin: begin.toString({ fractionalSecondDigits: 3 }),
    end: end.toString({ fractionalSecondDigits: 3 }),
  };
}

export function formatDuration(seconds?: number | null) {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds < 0) {
    return 'N/A';
  }
  return (
    [
      [Math.floor(seconds / 86400), 'd'],
      [Math.floor(seconds / 3600) % 24, 'h'],
      [Math.floor(seconds / 60) % 60, 'm'],
      [Math.floor(seconds) % 60, 's'],
    ]
      .filter(([value]) => Number(value) > 0)
      .map(([value, unit]) => `${value}${unit}`)
      .join(' ') || '0s'
  );
}

export function statusLabel(status?: string) {
  return status ? status.charAt(0).toUpperCase() + status.slice(1) : 'N/A';
}
