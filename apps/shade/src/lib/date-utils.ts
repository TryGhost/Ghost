const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const DAY_MS = 24 * 60 * 60 * 1000;

// Shown for a date that can't be parsed, so it can't be mistaken for a missing date
const INVALID_DATE = 'Invalid date';

interface DateTimeParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

const zonedFormatters = new Map<string, Intl.DateTimeFormat>();

// A time zone the browser doesn't know falls back to UTC, as it did with moment-timezone
const getZonedFormatter = (timeZone: string): Intl.DateTimeFormat => {
  let formatter = zonedFormatters.get(timeZone);
  if (!formatter) {
    try {
      formatter = new Intl.DateTimeFormat('en-US', {
        timeZone,
        hourCycle: 'h23',
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
      });
    } catch (error) {
      if (!(error instanceof RangeError)) {
        throw error;
      }
      formatter = getZonedFormatter('UTC');
    }
    zonedFormatters.set(timeZone, formatter);
  }
  return formatter;
};

// Without a time zone, the parts are in the browser's local time
const getDateTimeParts = (date: Date, timeZone?: string): DateTimeParts => {
  if (!timeZone) {
    return {
      year: date.getFullYear(),
      month: date.getMonth(),
      day: date.getDate(),
      hour: date.getHours(),
      minute: date.getMinutes(),
      second: date.getSeconds(),
    };
  }

  const parts = getZonedFormatter(timeZone).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);

  return {
    year: get('year'),
    month: get('month') - 1,
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
    second: get('second'),
  };
};

// Unlike Date.UTC(), this doesn't read years 0-99 as 1900-1999
const toUTCTime = ({ year, month, day, hour, minute, second }: DateTimeParts): number => {
  const date = new Date(0);
  date.setUTCFullYear(year, month, day);
  date.setUTCHours(hour, minute, second);
  return date.getTime();
};

// Wall-clock time that a time zone skips, such as 2:30am when clocks go forward, moves forward by
// the gap. Wall-clock time that it repeats reads as the first occurrence. Both match moment-timezone.
const fromWallClockTime = (parts: DateTimeParts, timeZone?: string): Date => {
  if (!timeZone) {
    // Local Date setters resolve skipped and repeated times the same way
    const date = new Date(0);
    date.setFullYear(parts.year, parts.month, parts.day);
    date.setHours(parts.hour, parts.minute, parts.second, 0);
    return date;
  }

  const wallClockTime = toUTCTime(parts);
  const readWallClockTime = (time: number) => toUTCTime(getDateTimeParts(new Date(time), timeZone));
  const getOffset = (time: number) => readWallClockTime(time) - time;

  // The offsets a day either side are the ones in use on each side of any change at this time
  const withOffsetBefore = wallClockTime - getOffset(wallClockTime - DAY_MS);
  const withOffsetAfter = wallClockTime - getOffset(wallClockTime + DAY_MS);
  if (withOffsetBefore === withOffsetAfter) {
    return new Date(withOffsetBefore);
  }

  const occurrences = [withOffsetBefore, withOffsetAfter]
    .filter((time) => readWallClockTime(time) === wallClockTime)
    .sort((a, b) => a - b);
  return new Date(occurrences[0] ?? withOffsetBefore);
};

// ISO 8601 dates and date-times in the forms moment reads, in the extended
// (`2025-04-15T13:05:00+01:00`) and basic (`20250415T130500+0100`) formats
const ISO_EXTENDED_DATE_TIME =
  /^(?<year>\d{4})-(?<month>\d{2})(?:-(?<day>\d{2})(?:[T ](?<hour>\d{2})(?::(?<minute>\d{2})(?::(?<second>\d{2})(?:[.,]\d+)?)?)?(?<offset>Z|(?<offsetSign>[+-])(?<offsetHours>\d{2}):?(?<offsetMinutes>\d{2})?)?)?)?$/;
const ISO_BASIC_DATE_TIME =
  /^(?<year>\d{4})(?<month>\d{2})(?<day>\d{2})(?:[T ](?<hour>\d{2})(?:(?<minute>\d{2})(?:(?<second>\d{2})(?:[.,]\d+)?)?)?(?<offset>Z|(?<offsetSign>[+-])(?<offsetHours>\d{2}):?(?<offsetMinutes>\d{2})?)?)?$/;

// An ISO 8601 date or date-time without an offset is wall-clock time in the time zone, as moment
// reads it. `new Date()` alone would read a date-only string as UTC midnight.
const parseDate = (value: string, timeZone?: string): Date | null => {
  const match = ISO_EXTENDED_DATE_TIME.exec(value) ?? ISO_BASIC_DATE_TIME.exec(value);
  if (!match?.groups) {
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  }

  const {
    year,
    month,
    day = '1',
    hour = '0',
    minute = '0',
    second = '0',
    offset,
    offsetSign,
    offsetHours = '0',
    offsetMinutes = '0',
  } = match.groups;
  const parts = {
    year: Number(year),
    month: Number(month) - 1,
    day: Number(day),
    hour: Number(hour),
    minute: Number(minute),
    second: Number(second),
  };

  // The formats only check the shape, so reject fields that would roll over, such as 30 February or 24:00
  const utc = new Date(toUTCTime(parts));
  const isValid =
    utc.getUTCMonth() === parts.month &&
    utc.getUTCDate() === parts.day &&
    utc.getUTCHours() === parts.hour &&
    utc.getUTCMinutes() === parts.minute &&
    utc.getUTCSeconds() === parts.second &&
    Number(offsetHours) < 24 &&
    Number(offsetMinutes) < 60;
  if (!isValid) {
    return null;
  }

  if (!offset) {
    return fromWallClockTime(parts, timeZone);
  }
  const offsetMs = (Number(offsetHours) * 60 + Number(offsetMinutes)) * 60 * 1000;
  return new Date(utc.getTime() - (offsetSign === '-' ? -offsetMs : offsetMs));
};

// Result is in the format of `7:09pm`
const formatTime = ({ hour, minute }: DateTimeParts): string =>
  `${hour % 12 || 12}:${String(minute).padStart(2, '0')}${hour < 12 ? 'am' : 'pm'}`;

// Result is in the format of `12 Jun 2025`, without the year when it's the current year
const formatDate = ({ year, month, day }: DateTimeParts, timeZone?: string): string => {
  const date = `${day} ${MONTHS[month]}`;
  return year === getDateTimeParts(new Date(), timeZone).year ? date : `${date} ${year}`;
};

// Format date for UI, result is in the format of `12 Jun 2025`
// Timestamps with an offset are shown in the given time zone, or in UTC without one
export const formatDisplayDate = (dateString: string, timezone?: string): string => {
  // If the date is a Date object, convert it to a string
  // @ts-expect-error This should error if dateString is not a string, but for some reason Typescript isn't catching this
  if (dateString instanceof Date) {
    dateString = dateString.toISOString();
  }
  // Fallback to empty string if dateString is an unexpected type. Better to fallback to empty string than to crash the app
  if (!dateString || dateString.length === 0 || typeof dateString !== 'string') {
    return '';
  }

  const timeZone = timezone || 'UTC';
  const date = parseDate(dateString, timeZone);
  return date ? formatDate(getDateTimeParts(date, timeZone), timeZone) : INVALID_DATE;
};

/**
 * Format a plain time in a given time zone.
 *
 * @example
 * formatDisplayTime('2020-04-20T18:09:12.345Z', 'Africa/Lagos')
 * // 7:09pm
 */
export const formatDisplayTime = (dateString: string, timezone: string): string => {
  if (!dateString) {
    return '';
  }

  const timeZone = timezone || 'UTC';
  const date = parseDate(dateString, timeZone);
  return date ? formatTime(getDateTimeParts(date, timeZone)) : INVALID_DATE;
};

/**
 * Formats a date based on the range, in the browser's time zone
 * - For ranges above 365 days: shows month and year (e.g. "Apr 2025")
 * - For ranges of 91 days or more: shows "Week of [date]"
 * - For other ranges: shows the date in the same format as formatDisplayDate
 */
export const formatDisplayDateWithRange = (
  date: string,
  range: number,
  showHours: boolean = false,
  hoursOnly: boolean = false,
): string => {
  if (!date) {
    return '';
  }

  const parsed = parseDate(date);
  if (!parsed) {
    return INVALID_DATE;
  }
  const parts = getDateTimeParts(parsed);

  if (range === 1 && hoursOnly) {
    return formatTime(parts);
  } else if (range === 1 && showHours) {
    return `${MONTHS[parts.month]} ${parts.day}, ${formatTime(parts)}`;
  } else if (range > 365) {
    return `${MONTHS[parts.month]} ${parts.year}`;
  } else if (range >= 91) {
    return `Week of ${formatDate(parts)}`;
  }
  return formatDate(parts);
};
