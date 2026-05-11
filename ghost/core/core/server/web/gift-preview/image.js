const fs = require('fs');
const path = require('path');

const CACHE_MAX_SIZE = 100;
const GIFT_CARD_NOISE_PATH = path.join(__dirname, 'gift-card-noise.png');
const GIFT_CARD_ORB_PATH = path.join(__dirname, 'gift-card-orb.png');
const INTER_FONT_PATH = path.join(__dirname, 'Inter.ttf');

const cache = new Map();
let giftCardNoiseTile;
let giftCardOrbImageHref;

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

    const orbPng = fs.readFileSync(GIFT_CARD_ORB_PATH);
    giftCardOrbImageHref = `data:image/png;base64,${orbPng.toString('base64')}`;

    return giftCardOrbImageHref;
}

async function getGiftCardNoiseTile() {
    if (giftCardNoiseTile !== undefined) {
        return giftCardNoiseTile;
    }

    const sharp = require('sharp');

    giftCardNoiseTile = await sharp(GIFT_CARD_NOISE_PATH)
        .resize(192, 192, {kernel: 'nearest'})
        .png()
        .toBuffer();

    return giftCardNoiseTile;
}

function parseHexColor(color) {
    const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(`${color || ''}`.trim());

    if (!match) {
        return null;
    }

    const hex = match[1].length === 3
        ? match[1].split('').map(char => char + char).join('')
        : match[1];

    return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16)
    };
}

function formatHexChannel(value) {
    return Math.round(value).toString(16).padStart(2, '0');
}

function mixWithBlack(color, colorWeight = 0.65) {
    const rgb = parseHexColor(color);

    if (!rgb) {
        return '#000000';
    }

    return `#${formatHexChannel(rgb.r * colorWeight)}${formatHexChannel(rgb.g * colorWeight)}${formatHexChannel(rgb.b * colorWeight)}`;
}

function truncateText(str, maxLength) {
    const text = `${str || ''}`.trim();

    if (text.length <= maxLength) {
        return text;
    }

    return `${text.slice(0, maxLength - 3).trim()}...`;
}

function createTextInput({text, size, weight, width}) {
    const escapedText = escapeXml(text);

    return {
        text: {
            text: `<span foreground="#FFFFFF" font_desc="Inter ${weight} ${size}">${escapedText}</span>`,
            font: 'Inter',
            fontfile: INTER_FONT_PATH,
            width,
            rgba: true,
            dpi: 72
        }
    };
}

function buildTextOverlays({siteTitle = 'Ghost', tierLabel = '', cadenceLabel = '1 year'}) {
    const safeCadenceLabel = truncateText(cadenceLabel, 18);
    const safeTierLabel = truncateText(tierLabel || 'Gift membership', 38);
    const safeSiteTitle = truncateText(siteTitle, 40);

    return [
        {
            input: createTextInput({
                text: safeCadenceLabel,
                size: 84,
                weight: 'Bold',
                width: 1060
            }),
            left: 64,
            top: 82
        },
        {
            input: createTextInput({
                text: safeTierLabel,
                size: 44,
                weight: 'Medium',
                width: 1060
            }),
            left: 66,
            top: 177
        },
        {
            input: createTextInput({
                text: safeSiteTitle,
                size: 52,
                weight: 'Bold',
                width: 1060
            }),
            left: 66,
            top: 500
        }
    ];
}

function buildSvg({accentColor}) {
    const escapedAccentColor = escapeXml(accentColor);
    const orbImageHref = escapeXml(getGiftCardOrbImageHref());

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
    <image href="${orbImageHref}" x="0" y="0" width="1200" height="630" opacity="0.2" preserveAspectRatio="none"/>
</svg>`;
}

function buildNotchOverlay({accentColor}) {
    const notchFill = escapeXml(mixWithBlack(accentColor));

    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
    <rect x="505" y="42" width="190" height="36" rx="18" fill="${notchFill}"/>
    <rect x="510" y="44" width="180" height="3" rx="1.5" fill="#FFFFFF" opacity="0.18"/>
</svg>`;

    return {
        input: Buffer.from(svg)
    };
}

async function generateGiftPreviewImage({accentColor = '#15171A', siteTitle, tierLabel, cadenceLabel}) {
    const cacheKey = JSON.stringify({
        accentColor,
        siteTitle,
        tierLabel,
        cadenceLabel
    });

    if (cache.has(cacheKey)) {
        return cache.get(cacheKey);
    }

    const sharp = require('sharp');

    const svg = buildSvg({accentColor});
    const noiseTile = await getGiftCardNoiseTile();
    const image = await sharp(Buffer.from(svg), {animated: false})
        .resize(1200, null, {
            withoutEnlargement: false
        })
        .composite([
            {
                input: noiseTile,
                tile: true
            },
            buildNotchOverlay({accentColor}),
            ...buildTextOverlays({siteTitle, tierLabel, cadenceLabel})
        ])
        .png()
        .timeout({seconds: 10})
        .toBuffer();

    cacheResult(cacheKey, image);

    return image;
}

module.exports = {
    generateGiftPreviewImage
};
