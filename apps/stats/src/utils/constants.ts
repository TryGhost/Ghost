// Time period constants
export const TIME_PERIODS = {
    DAYS_IN_WEEK: 7,
    DAYS_IN_MONTH: 31, // Using 31 for consistency with existing logic
    DAYS_IN_QUARTER: 91,
    DAYS_IN_YEAR: 365,
    DAYS_IN_YEAR_APPROX: 356, // Used for chart aggregation thresholds
    ALL_TIME_DAYS: 1000,
    YEAR_TO_DATE_FLAG: -1
} as const;

export const STATS_RANGES = {
    today: {
        name: 'Today',
        value: 1
    },
    last7Days: {
        name: 'Last 7 days',
        value: TIME_PERIODS.DAYS_IN_WEEK
    },
    last30Days: {
        name: 'Last 30 days',
        value: TIME_PERIODS.DAYS_IN_MONTH
    },
    last3Months: {
        name: 'Last 3 months',
        value: TIME_PERIODS.DAYS_IN_QUARTER
    },
    yearToDate: {
        name: 'Year to date',
        value: TIME_PERIODS.YEAR_TO_DATE_FLAG
    },
    last12Months: {
        name: 'Last 12 months',
        value: 12 * TIME_PERIODS.DAYS_IN_MONTH
    },
    allTime: {
        name: 'All time',
        value: TIME_PERIODS.ALL_TIME_DAYS
    }
};

export const STATS_RANGE_OPTIONS = Object.values(STATS_RANGES);

export const STATS_DEFAULT_RANGE_KEY = 2;

export const STATS_LABEL_MAPPINGS = {
    // Countries
    US: 'United States',
    TWN: 'Taiwan',
    TW: 'Taiwan',

    // Technical
    'mobile-ios': 'iOS',
    'mobile-android': 'Android',
    macos: 'macOS',

    // Sources
    'google.com': 'Google',
    'ghost.org': 'Ghost',
    'bing.com': 'Bing',
    'bsky.app': 'Bluesky',
    'yahoo.com': 'Yahoo',
    'duckduckgo.com': 'DuckDuckGo'
};

export const STATS_DEFAULT_SOURCE_ICON_URL = 'https://static.ghost.org/v5.0.0/images/globe-icon.svg';

// Audience selection bit flags
export const AUDIENCE_BITS = {
    PUBLIC: 1 << 0, // 1
    FREE: 1 << 1, // 2
    PAID: 1 << 2 // 4
} as const;

// Chart data thresholds
export const CHART_THRESHOLDS = {
    WEEKLY_AGGREGATION_MIN_DAYS: 60,
    MONTHLY_AGGREGATION_MIN_DAYS: 150,
    OUTLIER_MULTIPLIER: 10,
    OUTLIER_MAD_MULTIPLIER: 5,
    BULK_IMPORT_THRESHOLD: 10000,
    // Range normalization values for YTD
    FORCE_MONTHLY_RANGE: 400,
    FORCE_WEEKLY_RANGE: 100
} as const;
