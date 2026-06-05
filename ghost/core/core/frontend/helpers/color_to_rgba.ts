import {Color} from '@tryghost/color-utils';

const FALLBACK_COLOR = Color.rgb(21, 23, 26);

const parseColor = (rawColor: unknown): Color => {
    if (typeof rawColor !== 'string') {
        return FALLBACK_COLOR;
    }

    try {
        return Color(rawColor.trim());
    } catch {
        return FALLBACK_COLOR;
    }
};

const parseAlpha = (rawAlpha: unknown): number => {
    let result = 1;

    switch (typeof rawAlpha) {
    case 'number':
        result = rawAlpha;
        break;
    case 'string':
    case 'bigint':
        result = Number(rawAlpha);
        break;
    }

    if (Number.isNaN(result)) {
        result = 1;
    }

    return Math.max(0, Math.min(1, result));
};

module.exports = function color_to_rgba(rawColor: unknown, rawAlpha: unknown): string { // eslint-disable-line camelcase
    const color = parseColor(rawColor);
    const alpha = parseAlpha(rawAlpha);
    return color.alpha(alpha).rgb().string();
};
