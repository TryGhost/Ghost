const CACHE_MAX_SIZE = 100;

const cache = new Map();

function cacheResult(key, value) {
    if (cache.size >= CACHE_MAX_SIZE) {
        const firstKey = cache.keys().next().value;

        cache.delete(firstKey);
    }

    cache.set(key, value);
}

function escapeXml(str) {
    return str
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll('\'', '&apos;');
}

function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);

    if (!result) {
        return {r: 0, g: 0, b: 0};
    }

    return {
        r: Number.parseInt(result[1], 16),
        g: Number.parseInt(result[2], 16),
        b: Number.parseInt(result[3], 16)
    };
}

function getBackgroundColor(accentColor) {
    // Blend accent color at 6% opacity over white, matching Portal's redemption modal
    const {r, g, b} = hexToRgb(accentColor);
    const opacity = 0.06;
    const blend = c => Math.round(255 + (c - 255) * opacity);

    return `rgb(${blend(r)}, ${blend(g)}, ${blend(b)})`;
}

function buildSvg({accentColor}) {
    const bgColor = getBackgroundColor(accentColor);
    const escapedAccentColor = escapeXml(accentColor);

    // Gift box icon from Portal (apps/portal/src/images/icons/gift.svg)
    // Original viewBox 0 0 24 24, scaled and centered in the seal.
    const giftIcon = `
        <g transform="translate(564, 279) scale(3)" fill="none" stroke="#FFFFFF"
            stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="8" width="18" height="4" rx="1"/>
            <path d="M12 8v13"/>
            <path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/>
            <path d="M7.5 8a2.5 2.5 0 0 1 0-5C9 3 12 8 12 8"/>
            <path d="M16.5 8a2.5 2.5 0 0 0 0-5C15 3 12 8 12 8"/>
        </g>
    `;

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
    <rect width="1200" height="630" fill="${bgColor}"/>

    <rect x="0" y="303" width="1200" height="24" fill="${escapedAccentColor}"/>
    <rect x="588" y="0" width="24" height="630" fill="${escapedAccentColor}"/>

    <circle cx="600" cy="315" r="70" fill="${bgColor}"/>
    <circle cx="600" cy="315" r="58" fill="${escapedAccentColor}"/>

    ${giftIcon}
</svg>`;
}

async function generateGiftPreviewImage({accentColor}) {
    const cacheKey = accentColor;

    if (cache.has(cacheKey)) {
        return cache.get(cacheKey);
    }

    const imageTransform = require('@tryghost/image-transform');
    const svg = buildSvg({accentColor});
    const image = await imageTransform.resizeFromBuffer(Buffer.from(svg), {
        width: 1200,
        format: 'png',
        withoutEnlargement: false,
        timeout: 10
    });

    cacheResult(cacheKey, image);

    return image;
}

module.exports = {
    generateGiftPreviewImage
};
