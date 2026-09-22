// Converts straight "dumb" quotes into typographic quotes, apostrophes and primes
// See https://smartquotesforsmartpeople.com for the rules we follow

export const LEFT_DOUBLE_QUOTE = '“'; // “
export const RIGHT_DOUBLE_QUOTE = '”'; // ”
export const LEFT_SINGLE_QUOTE = '‘'; // ‘
export const RIGHT_SINGLE_QUOTE = '’'; // ’ (also the apostrophe)
export const PRIME = '′'; // ′ feet, minutes
export const DOUBLE_PRIME = '″'; // ″ inches, seconds

// a quote following one of these (or nothing) opens, otherwise it closes
const OPENING_CONTEXT_REGEX = /[\s([{<—–“‘]/;

// words that start with an apostrophe marking omitted letters, e.g. 'til or rock 'n' roll,
// plus abbreviated years like '90s. These need ’ even though they follow a space.
const LEADING_APOSTROPHE_REGEX = /^(\d\d(?!\d)|(?:tis|twas|til|em|n|cause|cos|bout|nuff)(?![\p{L}\p{N}]))/iu;

// 5′ or 5′10 - a measurement where a following " must be inches
const FEET_AND_INCHES_REGEX = /\d′\d+(\.\d+)?$/;

export function isOpeningContext(charBefore: string = ''): boolean {
    return charBefore === '' || OPENING_CONTEXT_REGEX.test(charBefore);
}

function hasUnclosedDoubleQuote(textBefore: string): boolean {
    return textBefore.lastIndexOf(LEFT_DOUBLE_QUOTE) > textBefore.lastIndexOf(RIGHT_DOUBLE_QUOTE);
}

// ’ doubles as an apostrophe so only count it as a closing quote when it isn't inside a word
function hasUnclosedSingleQuote(textBefore: string): boolean {
    const lastOpen = textBefore.lastIndexOf(LEFT_SINGLE_QUOTE);
    if (lastOpen === -1) {
        return false;
    }
    const closingRegex = /’(?![\p{L}\p{N}])/gu;
    closingRegex.lastIndex = lastOpen;
    return !closingRegex.test(textBefore);
}

/**
 * Returns the typographic replacement for a single straight quote
 * @param quote - either " or '
 * @param textBefore - text preceding the quote in the same paragraph, used to see whether a quote is open
 * @param textAfter - text following the quote when known, used to spot leading apostrophes like '90s
 */
export function getSmartQuote(quote: string, textBefore: string = '', textAfter: string = ''): string {
    const charBefore = textBefore.slice(-1);
    const afterDigit = /\d/.test(charBefore);
    const opening = isOpeningContext(charBefore);

    if (quote === '"') {
        // 5′10" is always inches, even inside a quotation
        if (FEET_AND_INCHES_REGEX.test(textBefore)) {
            return DOUBLE_PRIME;
        }
        if (afterDigit && !hasUnclosedDoubleQuote(textBefore)) {
            return DOUBLE_PRIME;
        }
        return opening ? LEFT_DOUBLE_QUOTE : RIGHT_DOUBLE_QUOTE;
    }

    if (quote === '\'') {
        // 5' is feet, but 1990's and '1984' use the apostrophe/closing quote
        if (afterDigit && !hasUnclosedSingleQuote(textBefore) && !/^\p{L}/u.test(textAfter)) {
            return PRIME;
        }
        if (opening && !LEADING_APOSTROPHE_REGEX.test(textAfter)) {
            return LEFT_SINGLE_QUOTE;
        }
        return RIGHT_SINGLE_QUOTE;
    }

    return quote;
}

/**
 * When a quote was typed before we knew what followed it, the next character typed can show
 * it was the wrong choice. Returns the index and replacement for the character to fix, e.g.
 *  - ‘90s or rock ‘n, where the ‘ was a leading apostrophe (fixed at the end of the word)
 *  - 1990′s, where the ′ was an apostrophe (fixed when the letter is typed)
 * @param textBeforeCaret - text before the caret
 * @param nextChar - the character about to be typed
 */
export function findMistypedQuote(textBeforeCaret: string, nextChar: string): {index: number, replacement: string} | null {
    const isWordChar = /[\p{L}\p{N}]/u.test(nextChar);

    if (!isWordChar) {
        const leading = textBeforeCaret.match(/\u2018(\d\ds?|tis|twas|til|em|n|cause|cos|bout|nuff)$/iu);
        if (leading && leading.index !== undefined && isOpeningContext(textBeforeCaret.charAt(leading.index - 1))) {
            return {index: leading.index, replacement: RIGHT_SINGLE_QUOTE};
        }
    }

    if (/^\p{L}$/u.test(nextChar) && /\d\u2032$/.test(textBeforeCaret)) {
        return {index: textBeforeCaret.length - 1, replacement: RIGHT_SINGLE_QUOTE};
    }

    return null;
}

/**
 * Converts every straight quote in a string, e.g. for pasted content.
 * Quotes inside {replacement, "strings"} are left alone as they are parsed later.
 * @param text - the text to convert
 * @param textBefore - text preceding it in the same paragraph
 */
export function smartenQuotes(text: string, textBefore: string = ''): string {
    if (!/["']/.test(text)) {
        return text;
    }

    let result = '';
    let braceDepth = 0;

    for (let i = 0; i < text.length; i++) {
        let char = text[i];

        if (char === '{') {
            braceDepth += 1;
        } else if (char === '}' && braceDepth > 0) {
            braceDepth -= 1;
        } else if ((char === '"' || char === '\'') && braceDepth === 0) {
            char = getSmartQuote(char, textBefore + result, text.slice(i + 1));
        }

        result += char;
    }

    return result;
}
