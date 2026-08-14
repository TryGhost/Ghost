export const CARD_WIDTHS = ['regular', 'wide', 'full'] as const;

export type CardWidth = typeof CARD_WIDTHS[number];

export function isCardWidth(width: unknown): width is CardWidth {
    return typeof width === 'string' && (CARD_WIDTHS as readonly string[]).includes(width);
}

export function normalizeCardWidth(width: unknown): CardWidth | undefined {
    return isCardWidth(width) ? width : undefined;
}
