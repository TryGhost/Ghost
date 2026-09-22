// Converts straight "dumb" quotes into typographic quotes and apostrophes
// See https://smartquotesforsmartpeople.com for the rules we follow

export const LEFT_DOUBLE_QUOTE = '“'; // “
export const RIGHT_DOUBLE_QUOTE = '”'; // ”
export const LEFT_SINGLE_QUOTE = '‘'; // ‘
export const RIGHT_SINGLE_QUOTE = '’'; // ’ (also the apostrophe)

// a quote following one of these (or nothing) opens, otherwise it closes
const OPENING_CONTEXT_REGEX = /[\s([{<—–“‘]/;

// words that start with an apostrophe marking omitted letters, e.g. 'til or rock 'n' roll,
// plus abbreviated years like '90s. These need ’ even though they follow a space.
const LEADING_APOSTROPHE_REGEX = /^(\d\d(?!\d)|(?:tis|twas|til|em|n|cause|cos|bout|nuff)(?![\p{L}\p{N}]))/iu;

export function isOpeningContext(charBefore: string = ''): boolean {
    return charBefore === '' || OPENING_CONTEXT_REGEX.test(charBefore);
}

/**
 * Returns the typographic replacement for a single straight quote
 * @param quote - either " or '
 * @param charBefore - the character immediately before the quote, empty string when at the start of a block
 * @param textAfter - text following the quote when known, used to spot leading apostrophes like '90s
 */
export function getSmartQuote(quote: string, charBefore: string = '', textAfter: string = ''): string {
    const opening = isOpeningContext(charBefore);

    if (quote === '"') {
        return opening ? LEFT_DOUBLE_QUOTE : RIGHT_DOUBLE_QUOTE;
    }

    if (quote === '\'') {
        if (opening && !LEADING_APOSTROPHE_REGEX.test(textAfter)) {
            return LEFT_SINGLE_QUOTE;
        }
        return RIGHT_SINGLE_QUOTE;
    }

    return quote;
}

/**
 * When a ‘ was typed before we knew what followed it, returns the index of that ‘ if the
 * text now shows it was a leading apostrophe (e.g. ‘90s or rock ‘n) so it can be flipped to ’
 */
export function findMistypedLeadingApostrophe(textBeforeCaret: string): number {
    const match = textBeforeCaret.match(/‘(\d\ds?|tis|twas|til|em|n|cause|cos|bout|nuff)$/iu);
    if (!match || match.index === undefined) {
        return -1;
    }
    if (!isOpeningContext(textBeforeCaret.charAt(match.index - 1))) {
        return -1;
    }
    return match.index;
}

/**
 * Converts every straight quote in a string, e.g. for pasted content.
 * Quotes inside {replacement, "strings"} are left alone as they are parsed later.
 * @param text - the text to convert
 * @param charBefore - the character preceding the text, empty string when at the start of a block
 */
export function smartenQuotes(text: string, charBefore: string = ''): string {
    if (!/["']/.test(text)) {
        return text;
    }

    let result = '';
    let braceDepth = 0;
    let previousChar = charBefore;

    for (let i = 0; i < text.length; i++) {
        let char = text[i];

        if (char === '{') {
            braceDepth += 1;
        } else if (char === '}' && braceDepth > 0) {
            braceDepth -= 1;
        } else if ((char === '"' || char === '\'') && braceDepth === 0) {
            char = getSmartQuote(char, previousChar, text.slice(i + 1));
        }

        result += char;
        previousChar = char;
    }

    return result;
}
