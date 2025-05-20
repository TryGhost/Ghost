import {clsx, type ClassValue} from 'clsx';
import isEmail from 'validator/es/lib/isEmail';
import {twMerge} from 'tailwind-merge';
import moment, {Moment} from 'moment-timezone';

/* Generic helper functions
/* -------------------------------------------------------------------------- */

// Helper to merge Tailwind classes
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

// Helper to debounce a function
export function debounce<T extends unknown[]>(func: (...args: T) => void, wait: number, immediate: boolean = false): (...args: T) => void {
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

// Check if string is a domain
export const isValidDomain = (value: string) => {
    return /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+(?:\/[\w-./?%&=]*)?$/i.test(value);
};

/* Data formatters
/* -------------------------------------------------------------------------- */

// Helper to convert kebab-case to PascalCase with numbers
export const kebabToPascalCase = (str: string): string => {
    const processed = str
        .replace(/[-_]([a-z0-9])/gi, (_, char) => char.toUpperCase());
    return processed.charAt(0).toUpperCase() + processed.slice(1);
};

// Helper to format a URL
export const formatUrl = (value: string, baseUrl?: string, nullable?: boolean) => {
    if (nullable && !value) {
        return {save: null, display: ''};
    }

    let url = value.trim();

    if (!url) {
        if (baseUrl) {
            return {save: '/', display: baseUrl};
        }
        return {save: '', display: ''};
    }

    // if we have an email address, add the mailto:
    if (isEmail(url)) {
        return {save: `mailto:${url}`, display: `mailto:${url}`};
    }

    const isAnchorLink = url.match(/^#/);
    if (isAnchorLink) {
        return {save: url, display: url};
    }

    const isProtocolRelative = url.match(/^(\/\/)/);
    if (isProtocolRelative) {
        return {save: url, display: url};
    }

    if (!baseUrl) {
        // Absolute URL with no base URL
        if (!url.startsWith('http')) {
            url = `https://${url}`;
        }
    }

    // If it doesn't look like a URL, leave it as is rather than assuming it's a pathname etc
    if (!url.match(/^[a-zA-Z0-9-]+:/) && !url.match(/^(\/|\?)/)) {
        return {save: url, display: url};
    }

    let parsedUrl: URL;

    try {
        parsedUrl = new URL(url, baseUrl);
    } catch (e) {
        return {save: url, display: url};
    }

    if (!baseUrl) {
        return {save: parsedUrl.toString(), display: parsedUrl.toString()};
    }
    const parsedBaseUrl = new URL(baseUrl);

    let isRelativeToBasePath = parsedUrl.pathname && parsedUrl.pathname.indexOf(parsedBaseUrl.pathname) === 0;

    // if our path is only missing a trailing / mark it as relative
    if (`${parsedUrl.pathname}/` === parsedBaseUrl.pathname) {
        isRelativeToBasePath = true;
    }

    const isOnSameHost = parsedUrl.host === parsedBaseUrl.host;

    // if relative to baseUrl, remove the base url before sending to action
    if (isOnSameHost && isRelativeToBasePath) {
        url = url.replace(/^[a-zA-Z0-9-]+:/, '');
        url = url.replace(/^\/\//, '');
        url = url.replace(parsedBaseUrl.host, '');
        url = url.replace(parsedBaseUrl.pathname, '');

        if (!url.match(/^\//)) {
            url = `/${url}`;
        }
    }

    if (!url.match(/\/$/) && !url.match(/[.#?]/)) {
        url = `${url}/`;
    }

    // we update with the relative URL but then transform it back to absolute
    // for the input value. This avoids problems where the underlying relative
    // value hasn't changed even though the input value has
    return {save: url, display: displayFromBase(url, baseUrl)};
};

// Helper to display a URL from a base URL
const displayFromBase = (url: string, baseUrl: string) => {
    // Ensure base url has a trailing slash
    if (!baseUrl.endsWith('/')) {
        baseUrl += '/';
    }

    // Remove leading slash from url
    if (url.startsWith('/')) {
        url = url.substring(1);
    }

    return new URL(url, baseUrl).toString();
};

// Format date for stats query
export const formatQueryDate = (date: Moment) => {
    return date.format('YYYY-MM-DD');
};

// Format date for UI, result is in the formate of `12 Jun 2025`
export const formatDisplayDate = (dateString: string): string => {
    const date = new Date(dateString);
    const today = new Date();
    const isToday = date.toISOString().slice(0, 10) === today.toISOString().slice(0, 10);
    const isCurrentYear = date.getUTCFullYear() === today.getUTCFullYear();

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = date.getUTCDate();
    const month = months[date.getUTCMonth()];
    const year = date.getUTCFullYear();

    if (isToday) {
        return `${day} ${month}`;
    }

    return isCurrentYear ? `${day} ${month}` : `${day} ${month} ${year}`;
};

// Add thousands indicator to numbers
export const formatNumber = (value: number): string => {
    return new Intl.NumberFormat('en-US').format(Math.round(value));
};

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
    return `${Math.round(value * 100)}%`;
};

// Format cents to Dollars
export const centsToDollars = (value: number) => {
    return Math.round(value / 100);
};

/* Chart formatters
/* -------------------------------------------------------------------------- */

// Calculates the Y-axis range with appropriate padding
export const getYRange = (data: { value: number }[]): {min: number; max: number} => {
    if (!data.length) {
        return {min: 0, max: 1};
    }

    const values = data.map(d => Number(d.value));
    let min = Math.min(...values);
    let max = Math.max(...values);

    // Helper function to round to nice numbers
    const roundToNiceNumber = (num: number, roundUp: boolean = false): number => {
        if (num === 0) {
            return 0;
        }

        const magnitude = Math.floor(Math.log10(Math.abs(num)));
        const scale = Math.pow(10, magnitude);

        // For numbers less than 1, use smaller steps
        if (magnitude < 0) {
            const steps = [0.1, 0.2, 0.25, 0.5, 1];
            const scaledNum = num * Math.pow(10, -magnitude);
            const step = steps.find(s => s >= scaledNum) || 1;
            return roundUp ?
                Math.ceil(num * Math.pow(10, -magnitude) / step) * step * scale :
                Math.floor(num * Math.pow(10, -magnitude) / step) * step * scale;
        }

        // For numbers >= 1, use standard steps
        const steps = [1, 2, 2.5, 5, 10];
        const scaledNum = num / scale;
        const step = steps.find(s => s >= scaledNum) || 10;
        return roundUp ?
            Math.ceil(num / (step * scale)) * step * scale :
            Math.floor(num / (step * scale)) * step * scale;
    };

    // If min and max are equal, create a range around the value
    if (min === max) {
        const value = min;
        // For zero, use a range of 0 to 1
        if (value === 0) {
            min = 0;
            max = 1;
        } else {
            // For non-zero values, create a 10% range around the value
            const range = Math.abs(value) * 0.1;
            min = roundToNiceNumber(Math.max(0, value - range));
            max = roundToNiceNumber(value + range, true);
        }
    } else {
        // First round min and max to nice numbers
        min = roundToNiceNumber(min);
        max = roundToNiceNumber(max, true);

        // Ensure minimum 10% range between min and max
        const range = max - min;
        const minRange = Math.max(Math.abs(max), Math.abs(min)) * 0.1;
        if (range < minRange) {
            const padding = (minRange - range) / 2;
            min = roundToNiceNumber(Math.max(0, min - padding));
            max = roundToNiceNumber(max + padding, true);
        }
    }

    return {min, max};
};

// Calculates the width needed for the Y-axis based on the formatted tick values
export const calculateYAxisWidth = (ticks: number[], formatter: (value: number) => string): number => {
    if (!ticks.length) {
        return 40;
    }

    // Get the longest formatted tick value
    const maxFormattedLength = Math.max(...ticks.map(tick => formatter(tick).length));

    // Approximate width based on character count (assuming monospace font)
    // Add padding for safety
    const width = Math.max(20, maxFormattedLength * 8 + 20);
    return width;
};

//Return today and startdate for charts
export const getRangeDates = (range: number) => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const endDate = moment().tz(timezone).endOf('day');
    const startDate = moment().tz(timezone).subtract(range - 1, 'days').startOf('day');
    return {startDate, endDate, timezone};
};

// Converts a country code to corresponding flag emoji
export function getCountryFlag(countryCode:string) {
    if (!countryCode || countryCode === null || countryCode.toUpperCase() === 'NULL' || countryCode === 'ᴺᵁᴸᴸ') {
        return '🏳️';
    }
    return countryCode.toUpperCase().replace(/./g, char => String.fromCodePoint(char.charCodeAt(0) + 127397)
    );
}

/**
 * Sanitizes chart data based on the date range
 * - For ranges between 91-356 days: shows weekly changes
 * - For ranges above 356 days: shows monthly changes
 * - For other ranges: keeps data as is
 * @param data The chart data to sanitize
 * @param range The date range in days
 * @param fieldName The name of the field to use for calculations
 * @param aggregationType The type of aggregation to use: 'sum', 'avg', or 'exact'
 */
export const sanitizeChartData = <T extends {date: string}>(data: T[], range: number, fieldName: keyof T = 'value' as keyof T, aggregationType: 'sum' | 'avg' | 'exact' = 'avg'): T[] => {
    if (!data.length) {
        return [];
    }

    if (range >= 91 && range <= 356) {
        // Weekly changes
        const weeklyData: T[] = [];
        let currentWeek = moment(data[0].date).startOf('week');
        let weekTotal = 0;
        let weekCount = 0;
        let lastValue = 0;

        data.forEach((item, index) => {
            const itemDate = moment(item.date);
            if (itemDate.isSame(currentWeek, 'week')) {
                weekTotal += Number(item[fieldName]);
                weekCount += 1;
                lastValue = Number(item[fieldName]);
            } else {
                // Add the value for the previous week
                weeklyData.push({
                    ...data[index - 1],
                    date: currentWeek.format('YYYY-MM-DD'),
                    [fieldName]: aggregationType === 'sum' ? weekTotal :
                        aggregationType === 'avg' ? (weekCount > 0 ? weekTotal / weekCount : 0) :
                            lastValue
                } as T);

                // Start new week
                currentWeek = itemDate.startOf('week');
                weekTotal = Number(item[fieldName]);
                weekCount = 1;
                lastValue = Number(item[fieldName]);
            }

            // Handle the last item
            if (index === data.length - 1) {
                weeklyData.push({
                    ...item,
                    date: currentWeek.format('YYYY-MM-DD'),
                    [fieldName]: aggregationType === 'sum' ? weekTotal :
                        aggregationType === 'avg' ? (weekCount > 0 ? weekTotal / weekCount : 0) :
                            lastValue
                } as T);
            }
        });

        return weeklyData;
    } else if (range > 356) {
        // Monthly changes
        const monthlyData: T[] = [];
        let currentMonth = moment(data[0].date).startOf('month');
        let monthTotal = 0;
        let monthCount = 0;
        let lastValue = 0;

        data.forEach((item, index) => {
            const itemDate = moment(item.date);
            if (itemDate.isSame(currentMonth, 'month')) {
                monthTotal += Number(item[fieldName]);
                monthCount += 1;
                lastValue = Number(item[fieldName]);
            } else {
                // Add the value for the previous month
                monthlyData.push({
                    ...data[index - 1],
                    date: currentMonth.format('YYYY-MM-DD'),
                    [fieldName]: aggregationType === 'sum' ? monthTotal :
                        aggregationType === 'avg' ? (monthCount > 0 ? monthTotal / monthCount : 0) :
                            lastValue
                } as T);

                // Start new month
                currentMonth = itemDate.startOf('month');
                monthTotal = Number(item[fieldName]);
                monthCount = 1;
                lastValue = Number(item[fieldName]);
            }

            // Handle the last item
            if (index === data.length - 1) {
                monthlyData.push({
                    ...item,
                    date: currentMonth.format('YYYY-MM-DD'),
                    [fieldName]: aggregationType === 'sum' ? monthTotal :
                        aggregationType === 'avg' ? (monthCount > 0 ? monthTotal / monthCount : 0) :
                            lastValue
                } as T);
            }
        });

        return monthlyData;
    }

    // Return original data for ranges < 91 days
    return data;
};

/**
 * Formats a date based on the range
 * - For ranges above 365 days: shows month and year (e.g. "Apr 2025")
 * - For ranges above 91 days: shows "Week of [date]"
 * - For other ranges: uses the default formatDisplayDate
 */
export const formatDisplayDateWithRange = (date: string, range: number): string => {
    if (range > 365) {
        return moment(date).format('MMM YYYY');
    } else if (range >= 91) {
        return `Week of ${formatDisplayDate(date)}`;
    }
    return formatDisplayDate(date);
};
