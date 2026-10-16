import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/* Generic helper functions
/* -------------------------------------------------------------------------- */

// Helper to merge Tailwind classes
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Helper to debounce a function
export function debounce<T extends unknown[]>(
  func: (...args: T) => void,
  wait: number,
  immediate: boolean = false,
): (...args: T) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null;

  return function (this: unknown, ...args: T): void {
    const later = () => {
      timeoutId = null;
      if (!immediate) {
        func.apply(this, args);
      }
    };

    const callNow = immediate && !timeoutId;

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(later, wait);

    if (callNow) {
      func.apply(this, args);
    }
  };
}

// Helper to find scroll parent of element
export function getScrollParent(node: Node | null): HTMLElement | null {
  if (!node) {
    return null;
  }

  if (node instanceof HTMLElement) {
    const overflowY = window.getComputedStyle(node).overflowY;
    const isScrollable = overflowY !== 'visible' && overflowY !== 'hidden';

    if (isScrollable && node.scrollHeight >= node.clientHeight) {
      return node;
    }
  }

  return getScrollParent(node.parentNode) || document.body;
}

/* Data formatters
/* -------------------------------------------------------------------------- */

// Helper to convert kebab-case to PascalCase with numbers
export const kebabToPascalCase = (str: string): string => {
  const processed = str.replace(/[-_]([a-z0-9])/gi, (_, char) => char.toUpperCase());
  return processed.charAt(0).toUpperCase() + processed.slice(1);
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const DAY_MS = 24 * 60 * 60 * 1000;

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
  return date ? formatDate(getDateTimeParts(date, timeZone), timeZone) : '';
};

/**
 * Format a plain time in a given time zone.
 *
 * @example
 * formatDisplayTime('2020-04-20T18:09:12.345Z', 'Africa/Lagos')
 * // 7:09pm
 */
export const formatDisplayTime = (dateString: string, timezone: string): string => {
  const date = parseDate(dateString, timezone);
  return date ? formatTime(getDateTimeParts(date, timezone)) : '';
};

// Helper function to format timestamp
export const formatTimestamp = (timestamp: string) => {
  const date = new Date(timestamp);
  const now = new Date();

  // Handle invalid dates
  if (isNaN(date.getTime())) {
    return 'Unknown';
  }

  // Both dates are now in the same timezone context (local)
  // The timestamp from DB is UTC but Date constructor handles the conversion
  const diffMs = now.getTime() - date.getTime();

  // Handle negative differences (future dates)
  if (diffMs < 0) {
    return 'Just now';
  }

  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) {
    return 'Just now';
  } else if (diffMins < 60) {
    return `${diffMins} min ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hr ago`;
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: diffDays > 365 ? 'numeric' : undefined,
    });
  }
};

// Add thousands indicator to numbers
export const formatNumber = (
  value: number,
  options?: Pick<Intl.NumberFormatOptions, 'minimumFractionDigits' | 'maximumFractionDigits'>,
): string => {
  if (isNaN(value) || !isFinite(value)) {
    return '0';
  }

  const formattedValue = options ? value : Math.round(value);
  return new Intl.NumberFormat('en-US', options).format(formattedValue);
};

// Abbreviate numbers
export function abbreviateNumber(number: number): string {
  const num = Number(number);

  if (Number.isNaN(num) || !Number.isFinite(number)) {
    return formatNumber(num);
  }

  if (num < 0) {
    return `-${abbreviateNumber(-num)}`;
  }

  if (num < 1000) {
    return formatNumber(num);
  }

  if (num < 1000000) {
    // For thousands: round to nearest 100 for 10.3k, nearest 1000 for 101k
    const roundTo = num < 100000 ? 100 : 1000;

    const rounded = Math.round(num / roundTo) * roundTo;
    const abbreviated = rounded / 1000;

    if (abbreviated === 1000) {
      return '1M';
    }

    const formatted = abbreviated % 1 === 0 ? abbreviated.toString() : abbreviated.toFixed(1);
    return `${formatted}k`;
  }

  // For millions: round to nearest 100,000 for 1.1M
  const roundTo = 100000;
  const rounded = Math.round(num / roundTo) * roundTo;
  const abbreviated = rounded / 1000000;
  const formatted = abbreviated % 1 === 0 ? abbreviated.toString() : abbreviated.toFixed(1);
  return `${formatted}M`;
}

// Format time duration
export const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  if (hours <= 0) {
    if (minutes <= 0) {
      return `${remainingSeconds}s`;
    }
    return `${minutes}m ${remainingSeconds}s`;
  }

  return `${hours}h ${minutes}m ${remainingSeconds}s`;
};

// Format a fraction to percentage
export const formatPercentage = (value: number) => {
  const percentage = value * 100;
  if (percentage === 0) {
    return '0%';
  } else if (percentage < 0.1) {
    return `${percentage.toFixed(2)}%`;
  } else if (percentage < 1) {
    return `${percentage.toFixed(1)}%`;
  }
  const rounded = Math.round(percentage);
  return `${new Intl.NumberFormat('en-US').format(rounded)}%`;
};

// Converts a country code to corresponding flag emoji
export function getCountryFlag(countryCode: string) {
  if (
    !countryCode ||
    countryCode === null ||
    countryCode.toUpperCase() === 'NULL' ||
    countryCode === 'ᴺᵁᴸᴸ' ||
    countryCode === 'ᴺᵁ'
  ) {
    return '🏳️';
  }
  return countryCode
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(char.charCodeAt(0) + 127397));
}

export const stringToHslColor = (str: string, saturation: string, lightness: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  const h = hash % 360;
  return 'hsl(' + h + ', ' + saturation + '%, ' + lightness + '%)';
};

/* Chart formatters
/* -------------------------------------------------------------------------- */

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
  const parsed = parseDate(date);
  if (!parsed) {
    return '';
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

export const getYRange = (data: { value: number }[]): { min: number; max: number } => {
  if (!data.length) {
    return { min: 0, max: 1 };
  }

  const values = data.map((d) => Number(d.value));
  let min = Math.min(...values);
  let max = Math.max(...values);

  if (min === max) {
    const value = min;
    return { min: Math.max(0, value - 1), max: value + 1 };
  }

  // Use a percentage-based padding (10% of the range)
  const padding = 0.02;

  // Add padding and ensure min is not negative
  min = Math.max(0, min - min * padding);
  max = max + max * padding;

  const range = max - min;

  // Determine the order of magnitude for rounding based on the range
  const rangeMagnitude = Math.floor(Math.log10(range));
  // Always round to at least 10s, but use larger steps for bigger ranges
  // const roundTo = Math.max(10, Math.pow(10, rangeMagnitude));
  const roundTo = Math.pow(10, rangeMagnitude);

  // Round min and max to the appropriate precision
  const roundedMax = Math.round(max / roundTo) * roundTo;
  max = roundedMax < max ? Math.ceil(max / roundTo) * roundTo : roundedMax;

  const roundedMin = Math.round(min / roundTo) * roundTo;
  min = roundedMin > min ? Math.floor(min / roundTo) * roundTo : roundedMin;
  min = Math.max(0, min);

  // Ensure we have a visible range even after rounding
  if (min === max) {
    const midPoint = (min + max) / 2;
    const smallRange = Math.max(Math.abs(midPoint) * padding, roundTo);
    min = Math.max(0, Math.floor(midPoint - smallRange));
    max = Math.ceil(midPoint + smallRange);
  }

  // Final safety check to ensure min is never negative
  min = Math.max(0, min);

  return { min, max };
};

// Calculates the width needed for the Y-axis based on the formatted tick values
export const calculateYAxisWidth = (
  ticks: number[],
  formatter: (value: number) => string,
): number => {
  if (!ticks.length) {
    return 40;
  }

  // Get the longest formatted tick value
  const maxFormattedLength = Math.max(...ticks.map((tick) => formatter(tick).length));

  // Approximate width based on character count (assuming monospace font)
  // Add padding for safety
  const width = Math.max(20, maxFormattedLength * 8 + 20);
  return width;
};
