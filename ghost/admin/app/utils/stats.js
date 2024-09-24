import moment from 'moment-timezone';

export const RANGE_OPTIONS = [
    {name: 'Last 24 hours', value: 1},
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
    {name: 'Logged out visitors', value: 'undefined'},
    {name: 'Free members', value: 'free'},
    {name: 'Paid members', value: 'paid'}
];

export function hexToRgba(hex, alpha = 1) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

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
    '#8E42FF', '#B07BFF', '#C7A0FF', '#DDC6FF', '#EBDDFF', '#F7EDFF'
];

export const getCountryFlag = (countryCode) => {
    if (!countryCode) {
        return '🏳️';
    }
    return countryCode.toUpperCase().replace(/./g, char => String.fromCodePoint(char.charCodeAt(0) + 127397)
    );
};

export function getDateRange(chartRange) {
    const endDate = moment().endOf('day');
    const startDate = moment().subtract(chartRange - 1, 'days').startOf('day');
    return {startDate, endDate};
}

export function getStatsParams(config, props, additionalParams = {}) {
    const {chartRange, audience, device, browser, location, source, pathname} = props;
    const {startDate, endDate} = getDateRange(chartRange);

    const params = {
        site_uuid: config.stats.id,
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

    return params;
}
