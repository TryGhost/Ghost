import { DateTime } from 'luxon';

const DEFAULT_DATE_LOCALE = 'en-gb';
const DEFAULT_TIMEZONE = 'Etc/UTC';

function dateFormatterFor(locale: string, timeZone: string): Intl.DateTimeFormat | null {
  try {
    return new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone,
    });
  } catch {
    return null;
  }
}

export function formatGiftDate(
  date: Date,
  { locale, timeZone }: { locale?: string | null; timeZone?: string | null },
): string {
  const publicationLocale = locale || DEFAULT_DATE_LOCALE;
  const publicationTimeZone = timeZone || DEFAULT_TIMEZONE;

  // Publication settings are stored unvalidated. Drop them one at a time so
  // a bad locale keeps the publication timezone, while a bad timezone still
  // falls back to a stable UTC date.
  const formatter =
    dateFormatterFor(publicationLocale, publicationTimeZone) ||
    dateFormatterFor(DEFAULT_DATE_LOCALE, publicationTimeZone) ||
    dateFormatterFor(DEFAULT_DATE_LOCALE, DEFAULT_TIMEZONE)!;

  return formatter.format(date);
}

export function getSiteDateValue(date: Date, timeZone: string): string {
  return DateTime.fromJSDate(date, { zone: timeZone }).toFormat('yyyy-MM-dd');
}
