import moment from 'moment-timezone';

export const TB_VERSION = 8;

export const RANGE_OPTIONS = [
    {name: 'Today', value: 1},
    {name: 'Last 7 days', value: 7},
    {name: 'Last 30 days', value: 30 + 1},
    {name: 'Last 3 months', value: 90 + 1},
    {name: 'Year to date', value: 365 + 1},
    {name: 'Last 12 months', value: 12 * (30 + 1)},
    {name: 'All time', value: 1000}
];

export const CONTENT_OPTIONS = [
    {name: 'Posts & pages', value: 'all'},
    {name: 'Posts', value: 'posts'},
    {name: 'Pages', value: 'pages'}
];

export const CAMPAIGN_OPTIONS = [
    {name: 'All campaigns', value: 'all'},
    {name: 'UTM Medium', value: 'utm-medium'},
    {name: 'UTM Source', value: 'utm-source'},
    {name: 'UTM Campaign', value: 'utm-campaign'},
    {name: 'UTM Content', value: 'utm-content'},
    {name: 'UTM Term', value: 'utm-term'}
];

export const AUDIENCE_TYPES = [
    {name: 'Anonymous visitors', value: 'undefined'},
    {name: 'Free members', value: 'free'},
    {name: 'Paid members', value: 'paid'}
];

export const STATS_LABEL_MAPPINGS = {
    // Countries
    US: 'United States',
    TWN: 'Taiwan',

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

/**
 * Converts a hex color to RGBA format
 * @param {string} hex - Hexadecimal color code (e.g. "#FF5500")
 * @param {number} [alpha=1] - Alpha transparency value between 0 and 1
 * @returns {string} RGBA color string (e.g. "rgba(255, 85, 0, 1)")
 */
export function hexToRgba(hex, alpha = 1) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Generates a monochrome color palette based on a base color
 * @param {string} baseColor - Base hexadecimal color to generate palette from
 * @param {number} [count=10] - Number of colors to generate in the palette
 * @returns {string[]} Array of hexadecimal color codes in the palette
 */
export function generateMonochromePalette(baseColor, count = 10) {
    // Convert hex to RGB
    let r = parseInt(baseColor.slice(1, 3), 16);
    let g = parseInt(baseColor.slice(3, 5), 16);
    let b = parseInt(baseColor.slice(5, 7), 16);

    // Convert RGB to HSL
    r /= 255, g /= 255, b /= 255;
    let max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
        h = s = 0; // achromatic
    } else {
        let d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }

    // Generate palette
    let palette = [];
    for (let i = 0; i < count; i++) {
        // Adjust the range based on the base color's lightness
        let rangeStart, rangeEnd;
        if (l < 0.5) {
            // For darker base colors
            rangeStart = 0.1;
            rangeEnd = 0.7;
        } else {
            // For lighter base colors
            rangeStart = 0.3;
            rangeEnd = 0.9;
        }

        let newL = rangeStart + (i / (count - 1)) * (rangeEnd - rangeStart);

        // Convert back to RGB
        let c = (1 - Math.abs(2 * newL - 1)) * s;
        let x = c * (1 - Math.abs((h * 6) % 2 - 1));
        let m = newL - c / 2;

        if (0 <= h && h < 1 / 6) {
            [r, g, b] = [c, x, 0];
        } else if (1 / 6 <= h && h < 2 / 6) {
            [r, g, b] = [x, c, 0];
        } else if (2 / 6 <= h && h < 3 / 6) {
            [r, g, b] = [0, c, x];
        } else if (3 / 6 <= h && h < 4 / 6) {
            [r, g, b] = [0, x, c];
        } else if (4 / 6 <= h && h < 5 / 6) {
            [r, g, b] = [x, 0, c];
        } else {
            [r, g, b] = [c, 0, x];
        }

        r = Math.round((r + m) * 255);
        g = Math.round((g + m) * 255);
        b = Math.round((b + m) * 255);

        palette.push(`#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`);
    }

    return palette;
}

export const barListColor = '#F1F3F4';

export const statsStaticColors = [
    '#A568FF', '#7B7BFF', '#B3CEFF', '#D4ECF7', '#EFFDFD', '#F7F7F7'
];

/**
 * Converts a country code to corresponding flag emoji
 * @param {string} countryCode - Two-letter ISO country code
 * @returns {string} Flag emoji for the specified country code
 */
export function getCountryFlag(countryCode) {
    if (!countryCode || countryCode === null || countryCode.toUpperCase() === 'ᴺᵁᴸᴸ') {
        return '🏳️';
    }
    return countryCode.toUpperCase().replace(/./g, char => String.fromCodePoint(char.charCodeAt(0) + 127397)
    );
}

/**
 * Gets the date range for stats based on the chart range
 * @param {number} chartRange - Number of days to include in the range
 * @returns {Object} Object containing startDate, endDate, and timezone
 */
export function getDateRange(chartRange) {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const endDate = moment().tz(timezone).endOf('day');
    const startDate = moment().tz(timezone).subtract(chartRange - 1, 'days').startOf('day');
    return {startDate, endDate, timezone};
}

/**
 * Formats a duration in hours and minutes
 * @param {number} duration - Duration in seconds
 * @returns {string} Formatted duration string (e.g. "2h 30m")
 */
export function formatVisitDuration(duration) {
    if (duration === null || duration === 0) {
        return '0s';
    }

    // Under a minute
    if (duration < 60) {
        return `${Math.floor(duration)}s`;
    }

    // Under an hour
    if (duration < 3600) {
        const minutes = Math.floor(duration / 60);
        const seconds = Math.floor(duration % 60);
        return `${minutes}m ${seconds}s`;
    }

    // Over an hour
    const hours = Math.floor(duration / 3600);
    const remainingMinutes = Math.floor((duration % 3600) / 60);
    return `${hours}h ${remainingMinutes}m`;
}

/**
 * Gets stats query parameters based on filters
 * @param {Object} config - Ghost config object
 * @param {Object} props - Filter properties
 * @param {Object} [additionalParams] - Additional query parameters to include
 * @returns {Object} Query parameters object
 */
export function getStatsParams(config, props, additionalParams = {}) {
    const {chartRange, audience, device, browser, location, source, pathname, os} = props;
    const {startDate, endDate, timezone} = getDateRange(chartRange);

    const params = {
        site_uuid: props.mockData ? 'mock_site_uuid' : config.stats.id,
        date_from: startDate.format('YYYY-MM-DD'), 
        date_to: endDate.format('YYYY-MM-DD'),
        ...additionalParams
    };

    if (audience.length > 0) {
        params.member_status = audience.join(',');
    }

    if (device) {
        params.device = device;
    }

    if (browser) {
        params.browser = browser;
    }

    if (location) {
        params.location = location;
    }

    if (source) {
        params.source = source === 'direct' ? '' : source;
    }

    if (pathname) {
        params.pathname = pathname;
    }

    if (os) {
        params.os = os;
    }

    if (timezone) {
        params.timezone = timezone;
    }

    return params;
}

/**
 * Gets the appropriate token for stats API requests
 * @param {Object} config - Ghost config object
 * @returns {string} Stats API token
 */
export function getToken(config) {
    return config?.stats?.local?.enabled ? config?.stats?.local?.token : config?.stats?.token;
}

/**
 * Builds the full endpoint URL for stats API requests
 * @param {Object} config - Ghost config object
 * @param {string} endpoint - API endpoint name
 * @param {string} [params] - URL query parameters
 * @returns {string} Full endpoint URL
 */
export function getEndpointUrl(config, endpoint, params = '') {
    return config?.stats?.local?.enabled ? 
        `${config?.stats?.local?.endpoint}/v0/pipes/${endpoint}.json?${params}` : 
        `${config?.stats?.endpoint}/v0/pipes/${endpoint}__v${TB_VERSION}.json?${params}`;
}
