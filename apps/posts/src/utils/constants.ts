export const STATS_RANGES = {
    TODAY: {name: 'Today', value: 1},
    LAST_7_DAYS: {name: 'Last 7 days', value: 7},
    LAST_30_DAYS: {name: 'Last 30 days', value: 30 + 1},
    LAST_3_MONTHS: {name: 'Last 3 months', value: 90 + 1},
    YEAR_TO_DATE: {name: 'Year to date', value: 365 + 1},
    LAST_12_MONTHS: {name: 'Last 12 months', value: 12 * (30 + 1)},
    ALL_TIME: {name: 'All time', value: 1000}
} as const;

export const STATS_LABEL_MAPPINGS = {
    // Countries
    US: 'United States',
    TWN: 'Taiwan',
    TW: 'Taiwan',
    CN: 'China',

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

// Values that represent unknown locations in the data
export const UNKNOWN_LOCATION_VALUES = ['NULL', 'ᴺᵁᴸᴸ', '', 'Others', 'Other'];

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
