// Converts straight "dumb" quotes into typographic quotes, apostrophes and primes
// See https://smartquotesforsmartpeople.com for the rules we follow

export const LEFT_DOUBLE_QUOTE = '“'; // “
export const RIGHT_DOUBLE_QUOTE = '”'; // ”
export const LEFT_SINGLE_QUOTE = '‘'; // ‘
export const RIGHT_SINGLE_QUOTE = '’'; // ’ (also the apostrophe)
export const PRIME = '′'; // ′ feet, minutes
export const DOUBLE_PRIME = '″'; // ″ inches, seconds

// French puts a narrow no-break space inside its guillemets: « comme ça »
export const NARROW_NO_BREAK_SPACE = ' ';

export interface QuoteStyle {
    // the pair a typed " becomes
    double: [string, string];
    // the pair a typed ' becomes (apostrophes are always ’)
    single: [string, string];
    // space inserted after an opening and before a closing quote
    spacing?: string;
    // words that start with an apostrophe marking omitted letters, in addition to the shared list
    leadingApostropheWords?: string[];
}

const ENGLISH: QuoteStyle = {double: ['“', '”'], single: ['‘', '’']};
const LOW_HIGH: QuoteStyle = {double: ['„', '“'], single: ['‚', '‘']}; // „German“
const LOW_RIGHT: QuoteStyle = {double: ['„', '”'], single: ['‘', '’']}; // „Croatian”
const GUILLEMETS: QuoteStyle = {double: ['«', '»'], single: ['“', '”']}; // «Spanish»
const SWISS: QuoteStyle = {double: ['«', '»'], single: ['‹', '›']};
const SAME_MARK: QuoteStyle = {double: ['”', '”'], single: ['’', '’']}; // ”Swedish”

// Keyed by language, with region-specific overrides keyed by the full tag. Based on
// https://en.wikipedia.org/wiki/Quotation_mark#Summary_table
const QUOTE_STYLES: Record<string, QuoteStyle> = {
    en: ENGLISH,
    nl: {...ENGLISH, leadingApostropheWords: ['s', 't', 'n']}, // ’s avonds, ’t is, ’n beetje
    de: {...LOW_HIGH, leadingApostropheWords: ['s', 'n', 'ne', 'nen', 'nem', 'ner']}, // ’s ist, ’nen Kaffee
    'de-CH': SWISS,
    cs: LOW_HIGH,
    sk: LOW_HIGH,
    sl: LOW_HIGH,
    bg: LOW_HIGH,
    lt: LOW_HIGH,
    et: LOW_HIGH,
    is: LOW_HIGH,
    hr: LOW_RIGHT,
    sr: {double: ['„', '”'], single: ['’', '’']},
    pl: {double: ['„', '”'], single: ['»', '«']},
    hu: {double: ['„', '”'], single: ['»', '«']},
    ro: {double: ['„', '”'], single: ['«', '»']},
    fr: {...SWISS, spacing: NARROW_NO_BREAK_SPACE},
    'fr-CH': SWISS,
    it: GUILLEMETS,
    'it-CH': SWISS,
    es: GUILLEMETS,
    ca: GUILLEMETS,
    pt: GUILLEMETS,
    'pt-BR': ENGLISH,
    el: GUILLEMETS,
    ru: {double: ['«', '»'], single: ['„', '“']},
    uk: {double: ['«', '»'], single: ['„', '“']},
    nb: {double: ['«', '»'], single: ['‘', '’']},
    nn: {double: ['«', '»'], single: ['‘', '’']},
    no: {double: ['«', '»'], single: ['‘', '’']},
    da: {double: ['»', '«'], single: ['›', '‹']},
    sv: SAME_MARK,
    fi: SAME_MARK
};

export const DEFAULT_QUOTE_STYLE = ENGLISH;

/**
 * The quotation marks used by a publication language, e.g. `de`, `pt-BR` or `fr-CH`.
 * Languages we don't know fall back to English-style quotes.
 */
export function getQuoteStyle(locale: string = ''): QuoteStyle {
    const [language = '', region] = locale.trim().replace(/_/g, '-').split('-');
    const tag = region ? `${language.toLowerCase()}-${region.toUpperCase()}` : '';
    return QUOTE_STYLES[tag] || QUOTE_STYLES[language.toLowerCase()] || DEFAULT_QUOTE_STYLE;
}

function escapeRegExp(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// a quote following one of these (or nothing) opens, otherwise it closes
const OPENING_CONTEXT_CHARS = '\\s([{<—–';

// words that start with an apostrophe marking omitted letters, e.g. 'til or rock 'n' roll,
// plus abbreviated years like '90s. These need ’ even though they follow a space.
const LEADING_APOSTROPHE_WORDS = ['tis', 'twas', 'til', 'em', 'n', 'cause', 'cos', 'bout', 'nuff'];

// 5′ or 5′10 - a measurement where a following " must be inches
const FEET_AND_INCHES_REGEX = /\d′\d+(\.\d+)?$/;

const WORD_CHAR_REGEX = /[\p{L}\p{N}]/u;

type StyleRegexes = {
    openingContext: RegExp;
    leadingApostrophe: RegExp;
    mistypedLeadingApostrophe: RegExp;
    mistypedApostrophe: RegExp | null;
};
const regexCache = new WeakMap<QuoteStyle, StyleRegexes>();

function getRegexes(style: QuoteStyle): StyleRegexes {
    let regexes = regexCache.get(style);
    if (!regexes) {
        const openingQuotes = escapeRegExp(style.double[0] + style.single[0] + (style.spacing ?? ''));
        const words = [...LEADING_APOSTROPHE_WORDS, ...(style.leadingApostropheWords ?? [])].join('|');
        regexes = {
            openingContext: new RegExp(`[${OPENING_CONTEXT_CHARS}${openingQuotes}]`, 'u'),
            leadingApostrophe: new RegExp(`^(\\d\\d(?!\\d)|(?:${words})(?![\\p{L}\\p{N}]))`, 'iu'),
            mistypedLeadingApostrophe: new RegExp(`${escapeRegExp(style.single[0])}(\\d\\d\\p{L}*|${words})$`, 'iu'),
            // in languages where the closing single quote isn't ’, a quote typed inside a word
            // (it's) looks like a closing quote until the next letter arrives
            mistypedApostrophe: style.single[1] === RIGHT_SINGLE_QUOTE
                ? null
                : new RegExp(`[\\p{L}\\p{N}]${escapeRegExp(style.single[1])}$`, 'u')
        };
        regexCache.set(style, regexes);
    }
    return regexes;
}

export function isOpeningContext(charBefore: string = '', style: QuoteStyle = DEFAULT_QUOTE_STYLE): boolean {
    return charBefore === '' || getRegexes(style).openingContext.test(charBefore);
}

/**
 * Whether a quote typed after a plain space closes an open quotation, as in « Bonjour » typed
 * with ordinary spaces in French. Only applies to languages that put a space inside their quotes.
 */
export function closesAfterSpace(quote: string, textBefore: string, style: QuoteStyle = DEFAULT_QUOTE_STYLE): boolean {
    if (!style.spacing || !textBefore.endsWith(' ')) {
        return false;
    }
    const pair = quote === '"' ? style.double : quote === '\'' ? style.single : null;
    return pair !== null && hasUnclosedQuote(textBefore.slice(0, -1), pair, style);
}

/**
 * Cheap check for whether typing a word character next could need `findMistypedQuote`,
 * so ordinary typing doesn't have to read the editor state
 */
export function mayHaveMistypedQuote(textBefore: string, style: QuoteStyle = DEFAULT_QUOTE_STYLE): boolean {
    return /\d′$/.test(textBefore) || (getRegexes(style).mistypedApostrophe?.test(textBefore) ?? false);
}

// whether a quotation opened with `open` hasn't been closed yet. ’ doubles as an apostrophe
// so a closing quote only counts when it isn't inside a word
function hasUnclosedQuote(textBefore: string, [open, close]: [string, string], style: QuoteStyle): boolean {
    if (open === close) {
        // ”Swedish” quotes use the same mark on both sides, so tell them apart by context
        let opens = 0;
        let closes = 0;
        for (let index = textBefore.indexOf(open); index !== -1; index = textBefore.indexOf(open, index + 1)) {
            if (isOpeningContext(textBefore.charAt(index - 1), style)) {
                opens += 1;
            } else if (!WORD_CHAR_REGEX.test(textBefore.charAt(index + 1))) {
                closes += 1;
            }
        }
        return opens > closes;
    }

    const lastOpen = textBefore.lastIndexOf(open);
    if (lastOpen === -1) {
        return false;
    }
    const closingRegex = new RegExp(`${escapeRegExp(close)}(?![\\p{L}\\p{N}])`, 'gu');
    closingRegex.lastIndex = lastOpen;
    return !closingRegex.test(textBefore);
}

/**
 * Returns the typographic replacement for a single straight quote
 * @param quote - either " or '
 * @param textBefore - text preceding the quote in the same paragraph, used to see whether a quote is open
 * @param textAfter - text following the quote when known, used to spot leading apostrophes like '90s
 * @param style - the quotation marks of the publication language
 */
export function getSmartQuote(quote: string, textBefore: string = '', textAfter: string = '', style: QuoteStyle = DEFAULT_QUOTE_STYLE): string {
    const charBefore = textBefore.slice(-1);
    const afterDigit = /\d/.test(charBefore);
    const opening = isOpeningContext(charBefore, style);
    const spacing = style.spacing ?? '';

    if (quote === '"') {
        // 5′10" is always inches, even inside a quotation
        if (FEET_AND_INCHES_REGEX.test(textBefore)) {
            return DOUBLE_PRIME;
        }
        if (afterDigit && !hasUnclosedQuote(textBefore, style.double, style)) {
            return DOUBLE_PRIME;
        }
        return opening ? style.double[0] + spacing : spacing + style.double[1];
    }

    if (quote === '\'') {
        // 5' is feet, but 1990's and '1984' use the apostrophe/closing quote
        if (afterDigit && !hasUnclosedQuote(textBefore, style.single, style) && !/^\p{L}/u.test(textAfter)) {
            return PRIME;
        }
        if (opening) {
            return getRegexes(style).leadingApostrophe.test(textAfter) ? RIGHT_SINGLE_QUOTE : style.single[0] + spacing;
        }
        // an apostrophe inside a word (it's, l'homme) is always ’, otherwise the quote closes
        const insideWord = WORD_CHAR_REGEX.test(charBefore)
            && (WORD_CHAR_REGEX.test(textAfter.charAt(0)) || !hasUnclosedQuote(textBefore, style.single, style));
        return insideWord ? RIGHT_SINGLE_QUOTE : spacing + style.single[1];
    }

    return quote;
}

/**
 * When a quote was typed before we knew what followed it, the next character typed can show
 * it was the wrong choice. Returns the index and replacement for the character to fix, e.g.
 *  - ‘90s or rock ‘n, where the ‘ was a leading apostrophe (fixed at the end of the word)
 *  - 1990′s, where the ′ was an apostrophe (fixed when the letter is typed)
 *  - ‚it‘s in German, where the ‘ was an apostrophe (fixed when the letter is typed)
 * @param textBeforeCaret - text before the caret
 * @param nextChar - the character about to be typed
 * @param style - the quotation marks of the publication language
 */
export function findMistypedQuote(textBeforeCaret: string, nextChar: string, style: QuoteStyle = DEFAULT_QUOTE_STYLE): {index: number, replacement: string} | null {
    const isWordChar = WORD_CHAR_REGEX.test(nextChar);
    const regexes = getRegexes(style);

    if (!isWordChar && style.single[0] !== RIGHT_SINGLE_QUOTE) {
        const leading = textBeforeCaret.match(regexes.mistypedLeadingApostrophe);
        if (leading && leading.index !== undefined && isOpeningContext(textBeforeCaret.charAt(leading.index - 1), style)) {
            return {index: leading.index, replacement: RIGHT_SINGLE_QUOTE};
        }
    }

    if (isWordChar && regexes.mistypedApostrophe?.test(textBeforeCaret)) {
        return {index: textBeforeCaret.length - 1, replacement: RIGHT_SINGLE_QUOTE};
    }

    if (/^\p{L}$/u.test(nextChar) && /\d′$/.test(textBeforeCaret)) {
        return {index: textBeforeCaret.length - 1, replacement: RIGHT_SINGLE_QUOTE};
    }

    return null;
}

/**
 * Converts every straight quote in a string, e.g. for pasted content.
 * Quotes inside {replacement, "strings"} are left alone as they are parsed later.
 * @param text - the text to convert
 * @param textBefore - text preceding it in the same paragraph
 * @param style - the quotation marks of the publication language
 */
export function smartenQuotes(text: string, textBefore: string = '', style: QuoteStyle = DEFAULT_QUOTE_STYLE): string {
    if (!/["']/.test(text)) {
        return text;
    }

    const spacing = style.spacing;
    let result = '';
    let braceDepth = 0;

    for (let i = 0; i < text.length; i++) {
        let char = text[i];

        if (char === '{') {
            braceDepth += 1;
        } else if (char === '}' && braceDepth > 0) {
            braceDepth -= 1;
        } else if ((char === '"' || char === '\'') && braceDepth === 0) {
            // « texte » - plain spaces the writer put inside the quotes make way for ours
            if (closesAfterSpace(char, textBefore + result, style)) {
                result = result.slice(0, -1);
            }
            char = getSmartQuote(char, textBefore + result, text.slice(i + 1), style);
            if (spacing && char.endsWith(spacing) && text[i + 1] === ' ') {
                i += 1;
            }
        }

        result += char;
    }

    return result;
}
