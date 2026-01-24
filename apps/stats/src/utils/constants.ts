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
    'duckduckgo.com': 'DuckDuckGo',

    // Unknown/Other values - normalize to "Unknown"
    unknown: 'Unknown',
    Others: 'Unknown',
    Other: 'Unknown',
    NULL: 'Unknown',
    ᴺᵁᴸᴸ: 'Unknown'
};

// Values that represent unknown locations in the data
export const UNKNOWN_LOCATION_VALUES = ['NULL', 'ᴺᵁᴸᴸ', '', 'Others', 'Other'];

export const STATS_DEFAULT_SOURCE_ICON_URL = 'https://static.ghost.org/v5.0.0/images/globe-icon.svg';

// Audience bitmask values for filtering stats by visitor type
export const AUDIENCE_BITS = {
    PUBLIC: 1 << 0, // 1
    FREE: 1 << 1, // 2
    PAID: 1 << 2 // 4
};

// All audiences selected (PUBLIC | FREE | PAID = 7)
export const ALL_AUDIENCES = AUDIENCE_BITS.PUBLIC | AUDIENCE_BITS.FREE | AUDIENCE_BITS.PAID;

export const AUDIENCE_TYPES = [
    {name: 'Public visitors', value: 'undefined', bit: AUDIENCE_BITS.PUBLIC},
    {name: 'Free members', value: 'free', bit: AUDIENCE_BITS.FREE},
    {name: 'Paid members', value: 'paid', bit: AUDIENCE_BITS.PAID}
];
