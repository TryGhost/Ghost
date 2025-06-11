export const STATS_RANGES = {
    today: {
        name: 'Today',
        value: 1
    },
    last7Days: {
        name: 'Last 7 days',
        value: 7
    },
    last30Days: {
        name: 'Last 30 days',
        value: 30 + 1
    },
    last3Months: {
        name: 'Last 3 months',
        value: 91
    },
    yearToDate: {
        name: 'Year to date',
        value: -1
    },
    last12Months: {
        name: 'Last 12 months',
        value: 12 * (30 + 1)
    },
    allTime: {
        name: 'All time',
        value: 1000
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
