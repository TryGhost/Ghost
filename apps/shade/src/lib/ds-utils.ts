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
