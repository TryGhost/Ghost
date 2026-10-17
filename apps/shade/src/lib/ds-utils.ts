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

interface DateTimeParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

const zonedFormatters = new Map<string, Intl.DateTimeFormat>();

const getZonedFormatter = (timeZone: string): Intl.DateTimeFormat => {
  let formatter = zonedFormatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
    });
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
  };
};

const WALL_CLOCK_DATE_TIME =
  /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?)?$/;

// An ISO 8601 date or date-time without an offset is wall-clock time in the display time zone,
// as moment reads it. `new Date()` alone would read a date-only string as UTC midnight.
const parseDateTimeParts = (value: string, timeZone?: string): DateTimeParts | null => {
  const wallClock = WALL_CLOCK_DATE_TIME.exec(value);
  if (wallClock) {
    const [, year, month, day, hour = '0', minute = '0', second = '0'] = wallClock;
    const parts = {
      year: Number(year),
      month: Number(month) - 1,
      day: Number(day),
      hour: Number(hour),
      minute: Number(minute),
    };

    // The pattern only checks the shape, so reject fields that would roll over, such as 30 February or 25:00
    const utc = new Date(
      Date.UTC(parts.year, parts.month, parts.day, parts.hour, parts.minute, Number(second)),
    );
    const isValid =
      utc.getUTCMonth() === parts.month &&
      utc.getUTCDate() === parts.day &&
      utc.getUTCHours() === parts.hour &&
      utc.getUTCMinutes() === parts.minute &&
      utc.getUTCSeconds() === Number(second);

    return isValid ? parts : null;
  }

  const date = new Date(value);
  if (isNaN(date.getTime())) {
    return null;
  }
  return getDateTimeParts(date, timeZone);
};

// Result is in the format of `7:09pm`
const formatTime = ({ hour, minute }: DateTimeParts): string =>
  `${hour % 12 || 12}:${String(minute).padStart(2, '0')}${hour < 12 ? 'am' : 'pm'}`;

// Format date for UI, result is in the format of `12 Jun 2025`
// When timezone is provided, the date will be converted to that timezone before formatting
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

  // Check if this is a datetime string (contains time) or just a date
  const hasTime = dateString.includes(':');
  const isISOFormat = dateString.includes('T') || dateString.includes('Z');

  let day, month, year, isToday, isCurrentYear;

  // If timezone is provided and this is an ISO format date, convert it to that timezone
  if (timezone && isISOFormat) {
    const date = parseDateTimeParts(dateString, timezone);
    if (!date) {
      return '';
    }
    const today = getDateTimeParts(new Date(), timezone);

    day = date.day;
    month = date.month;
    year = date.year;
    isToday = year === today.year && month === today.month && day === today.day;
    isCurrentYear = year === today.year;
  } else {
    const date = new Date(dateString);
    const today = new Date();

    if (hasTime && !isISOFormat) {
      // This is a localized datetime string like "2025-07-29 19:00:00"
      // Use local date methods to avoid timezone conversion
      day = date.getDate();
      month = date.getMonth();
      year = date.getFullYear();
      isToday = date.toDateString() === today.toDateString();
      isCurrentYear = year === today.getFullYear();
    } else {
      // This is either a date-only string or an ISO format with timezone (without explicit timezone param)
      // Use UTC methods as before
      day = date.getUTCDate();
      month = date.getUTCMonth();
      year = date.getUTCFullYear();
      isToday = date.toISOString().slice(0, 10) === today.toISOString().slice(0, 10);
      isCurrentYear = year === today.getUTCFullYear();
    }
  }

  const monthName = MONTHS[month];

  if (isToday) {
    return `${day} ${monthName}`;
  }

  return isCurrentYear ? `${day} ${monthName}` : `${day} ${monthName} ${year}`;
};

/**
 * Format a plain time in a given time zone.
 *
 * @example
 * formatDisplayTime('2020-04-20T18:09:12.345Z', 'Africa/Lagos')
 * // 7:09pm
 */
export const formatDisplayTime = (dateString: string, timezone: string): string => {
  const parts = parseDateTimeParts(dateString, timezone);
  return parts ? formatTime(parts) : '';
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
 * Formats a date based on the range
 * - For ranges above 365 days: shows month and year (e.g. "Apr 2025")
 * - For ranges above 91 days: shows "Week of [date]"
 * - For other ranges: uses the default formatDisplayDate
 */
export const formatDisplayDateWithRange = (
  date: string,
  range: number,
  showHours: boolean = false,
  hoursOnly: boolean = false,
): string => {
  const parts = parseDateTimeParts(date);
  if (!parts) {
    return '';
  }

  if (range === 1 && hoursOnly) {
    return formatTime(parts);
  } else if (range === 1 && showHours) {
    return `${MONTHS[parts.month]} ${parts.day}, ${formatTime(parts)}`;
  } else if (range > 365) {
    return `${MONTHS[parts.month]} ${parts.year}`;
  } else if (range >= 91) {
    return `Week of ${formatDisplayDate(date)}`;
  }
  return formatDisplayDate(date);
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
