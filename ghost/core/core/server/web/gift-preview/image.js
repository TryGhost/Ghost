const fs = require('fs');
const path = require('path');

const CACHE_MAX_SIZE = 100;
const GIFT_CARD_ORB_PATH = path.join(__dirname, 'gift-card-orb.svg');
const FONTCONFIG_FILE_PATH = path.join(__dirname, 'fonts.conf');
const FONT_STACK = 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Helvetica, Arial, sans-serif';

const cache = new Map();
let giftCardOrbImageHref;

// librsvg resolves SVG fonts through fontconfig, so configure it before
// @tryghost/image-transform loads sharp/libvips.
process.env.FONTCONFIG_FILE = FONTCONFIG_FILE_PATH;

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

function getGiftCardOrbImageHref() {
    if (giftCardOrbImageHref !== undefined) {
        return giftCardOrbImageHref;
    }

    const orbSvg = fs.readFileSync(GIFT_CARD_ORB_PATH, 'utf8');
    const [, imageHref = ''] = orbSvg.match(/xlink:href="(data:image\/png;base64,[^"]+)"/) || [];

    giftCardOrbImageHref = imageHref;

    return giftCardOrbImageHref;
}

function truncateText(str, maxLength) {
    const text = `${str || ''}`.trim();

    if (text.length <= maxLength) {
        return text;
    }

    return `${text.slice(0, maxLength - 3).trim()}...`;
}

function buildSvg({accentColor, siteTitle = 'Ghost', tierName = '', cadenceLabel = '1 year'}) {
    const escapedAccentColor = escapeXml(accentColor);
    const orbImageHref = escapeXml(getGiftCardOrbImageHref());
    const safeCadenceLabel = escapeXml(truncateText(cadenceLabel, 18));
    const safeTierLabel = escapeXml(truncateText(tierName ? `${tierName} membership` : 'Gift membership', 38));
    const safeSiteTitle = escapeXml(truncateText(siteTitle, 40));

    const textX = 64;

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
    <defs>
        <linearGradient id="cardShine" x1="120" y1="580" x2="980" y2="60" gradientUnits="userSpaceOnUse">
            <stop stop-color="#FFFFFF" stop-opacity="0"/>
            <stop offset="0.5" stop-color="#FFFFFF" stop-opacity="0.31"/>
            <stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/>
        </linearGradient>
    </defs>

    <rect width="1200" height="630" fill="${escapedAccentColor}"/>
    <rect width="1200" height="630" fill="#FFFFFF" opacity="0.07"/>
    <rect width="1200" height="630" fill="url(#cardShine)"/>
    <image href="${orbImageHref}" x="-170" y="-1045" width="2050" height="2050" opacity="0.2" preserveAspectRatio="xMidYMid slice"/>

    <rect x="505" y="42" width="190" height="36" rx="18" fill="#000000" opacity="0.36"/>
    <rect x="510" y="44" width="180" height="3" rx="1.5" fill="#FFFFFF" opacity="0.18"/>

    <text x="${textX}" y="150" font-family="${FONT_STACK}" font-size="84" font-weight="700" letter-spacing="0" line-height="1" fill="#FFFFFF">${safeCadenceLabel}</text>
    <text x="${textX + 2}" y="220" font-family="${FONT_STACK}" font-size="44" font-weight="500" letter-spacing="0" fill="#FFFFFF">${safeTierLabel}</text>

    <text x="${textX + 2}" y="555" font-family="${FONT_STACK}" font-size="52" font-weight="700" letter-spacing="0" fill="#FFFFFF">${safeSiteTitle}</text>
</svg>`;
}

async function generateGiftPreviewImage({accentColor = '#15171A', siteTitle, tierName, cadenceLabel}) {
    const cacheKey = JSON.stringify({
        accentColor,
        siteTitle,
        tierName,
        cadenceLabel
    });

    if (cache.has(cacheKey)) {
        return cache.get(cacheKey);
    }

    const imageTransform = require('@tryghost/image-transform');
    const svg = buildSvg({accentColor, siteTitle, tierName, cadenceLabel});
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
