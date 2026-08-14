import {CARD_WIDTHS, type CardWidth, isCardWidth} from '@tryghost/kg-default-nodes';

const VALID_IMAGE_CARD_WIDTHS = CARD_WIDTHS;
export type ImageCardWidth = CardWidth;

export function getAllowedImageCardWidths(configuredWidths?: unknown): readonly ImageCardWidth[] {
    if (!Array.isArray(configuredWidths)) {
        return VALID_IMAGE_CARD_WIDTHS;
    }

    const filteredWidths = [...new Set(configuredWidths.filter(isCardWidth))];

    if (filteredWidths.length === 0) {
        return VALID_IMAGE_CARD_WIDTHS;
    }

    return filteredWidths;
}

export function getDefaultImageCardWidth(allowedWidths: readonly ImageCardWidth[]): ImageCardWidth {
    if (allowedWidths.includes('regular')) {
        return 'regular';
    }

    return allowedWidths[0] ?? 'regular';
}
