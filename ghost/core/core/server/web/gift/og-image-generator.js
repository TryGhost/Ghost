const LRU_MAX_SIZE = 100;
const cache = new Map();

function evictOldest() {
    if (cache.size >= LRU_MAX_SIZE) {
        const firstKey = cache.keys().next().value;
        cache.delete(firstKey);
    }
}

function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) {
        return {r: 0, g: 0, b: 0};
    }
    return {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    };
}

// Blend accent color at 6% opacity over white, matching Portal's redemption modal
function getBackgroundColor(accentColor) {
    const {r, g, b} = hexToRgb(accentColor);
    const opacity = 0.06;
    const blend = c => Math.round(255 + (c - 255) * opacity);
    return `rgb(${blend(r)}, ${blend(g)}, ${blend(b)})`;
}

function buildSvg({tierName, cadenceLabel, accentColor}) {
    // Truncate long tier names
    const displayTier = tierName.length > 30 ? tierName.slice(0, 28) + '...' : tierName;
    const bgColor = getBackgroundColor(accentColor);

    // Gift box icon from Portal (apps/portal/src/images/icons/gift.svg)
    // Original viewBox 0 0 24 24, scaled 4x and centered at x=600
    const giftIcon = `
        <g transform="translate(552, 145) scale(4)" fill="none" stroke="${escapeXml(accentColor)}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="8" width="18" height="4" rx="1"/>
            <path d="M12 8v13"/>
            <path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/>
            <path d="M7.5 8a2.5 2.5 0 0 1 0-5C9 3 12 8 12 8"/>
            <path d="M16.5 8a2.5 2.5 0 0 0 0-5C15 3 12 8 12 8"/>
        </g>
    `;

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
    <!-- Background: accent color at 6% opacity over white -->
    <rect width="1200" height="630" fill="${bgColor}"/>

    ${giftIcon}

    <!-- GIFT MEMBERSHIP label -->
    <text x="600" y="303" text-anchor="middle"
          font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="700"
          letter-spacing="2" fill="${escapeXml(accentColor)}">GIFT MEMBERSHIP</text>

    <!-- Main heading -->
    <text x="600" y="380" text-anchor="middle"
          font-family="Arial, Helvetica, sans-serif" font-size="54" font-weight="800"
          letter-spacing="-1" fill="#15171A">You&#x2019;ve been gifted a membership</text>

    <!-- Tier and duration -->
    <text x="600" y="445" text-anchor="middle"
          font-family="Arial, Helvetica, sans-serif" font-size="36"
          fill="#666666"><tspan font-weight="700">${escapeXml(displayTier)}</tspan> &#x00B7; ${escapeXml(cadenceLabel)}</text>
</svg>`;
}

function escapeXml(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

async function generateGiftOgImage({tierName, cadenceLabel, accentColor}) {
    const cacheKey = `${tierName}:${cadenceLabel}:${accentColor}`;

    if (cache.has(cacheKey)) {
        return cache.get(cacheKey);
    }

    const imageTransform = require('@tryghost/image-transform');
    const svg = buildSvg({tierName, cadenceLabel, accentColor});
    const png = await imageTransform.resizeFromBuffer(Buffer.from(svg), {
        width: 1200,
        format: 'png',
        withoutEnlargement: false
    });

    evictOldest();
    cache.set(cacheKey, png);

    return png;
}

module.exports = {
    generateGiftOgImage
};
