/**
 * Grandfathered tags from BCP 47 (RFC 5646)
 * Source: IANA Language Subtag Registry
 * https://www.iana.org/assignments/language-subtag-registry/language-subtag-registry
 *
 * These 26 legacy tags from RFC 3066 don't follow current BCP 47 syntax
 * but must be accepted for backward compatibility. They're a fixed list
 * from the IANA registry - no additions or removals allowed.
 */
const GRANDFATHERED_TAGS = new Set([
    // Irregular - don't match standard syntax
    'en-gb-oed',
    'i-ami',
    'i-bnn',
    'i-default',
    'i-enochian',
    'i-hak',
    'i-klingon',
    'i-lux',
    'i-mingo',
    'i-navajo',
    'i-pwn',
    'i-tao',
    'i-tay',
    'i-tsu',
    'sgn-be-fr',
    'sgn-be-nl',
    'sgn-ch-de',
    // Regular - valid syntax but non-registry subtags
    'art-lojban',
    'cel-gaulish',
    'no-bok',
    'no-nyn',
    'zh-guoyu',
    'zh-hakka',
    'zh-min',
    'zh-min-nan',
    'zh-xiang'
]);

/**
 * Validates a BCP 47 language tag
 * @param value - The locale string to validate
 * @returns null if valid, error message string if invalid
 */
export const validateLocale = (value: string): string | null => {
    const errorMessage = 'Invalid locale format. Examples: en, pt-BR, zh-Hant, sr-Cyrl, x-private';

    if (!value) {
        return 'Enter a value';
    }

    const trimmedValue = value.trim();

    if (!trimmedValue) {
        return errorMessage;
    }

    if (GRANDFATHERED_TAGS.has(trimmedValue.toLowerCase())) {
        return null;
    }

    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/i.test(trimmedValue)) {
        return errorMessage;
    }

    const segments = trimmedValue.split('-');

    // Private use tags (x-something)
    if (segments[0].toLowerCase() === 'x') {
        // Must have at least one subtag after 'x'
        if (segments.length < 2) {
            return errorMessage;
        }
        // All remaining segments must be 1-8 alphanumeric characters
        for (let i = 1; i < segments.length; i++) {
            if (segments[i].length < 1 || segments[i].length > 8) {
                return errorMessage;
            }
        }
        return null;
    }

    // Regular language tags
    let position = 0;

    // Language subtag (required): 2-3 letters
    const languageSubtag = segments[position];
    if (!/^[a-z]{2,3}$/i.test(languageSubtag)) {
        return errorMessage;
    }
    position += 1;

    // Script subtag (optional): 4 letters
    if (position < segments.length && /^[a-z]{4}$/i.test(segments[position])) {
        position += 1;
    }

    // Region subtag (optional): 2 letters or 3 digits
    if (position < segments.length && /^([a-z]{2}|[0-9]{3})$/i.test(segments[position])) {
        position += 1;
    }

    // Variant subtags (optional): 5-8 alphanumeric or digit + 3 alphanumeric
    while (position < segments.length &&
           /^([a-z0-9]{5,8}|[0-9][a-z0-9]{3})$/i.test(segments[position])) {
        position += 1;
    }

    // Extension subtags (optional): single char (not x) + one or more 2-8 char subtags
    while (position < segments.length) {
        if (/^[0-9a-wy-z]$/i.test(segments[position])) {
            position += 1;
            if (position >= segments.length || !/^[a-z0-9]{2,8}$/i.test(segments[position])) {
                return errorMessage;
            }
            position += 1;
            while (position < segments.length && /^[a-z0-9]{2,8}$/i.test(segments[position])) {
                position += 1;
            }
        } else {
            break;
        }
    }

    // Private use at the end (optional): x + one or more subtags (lenient on length)
    if (position < segments.length && segments[position].toLowerCase() === 'x') {
        position += 1;
        if (position >= segments.length) {
            return errorMessage;
        }
        while (position < segments.length) {
            if (!/^[a-z0-9]+$/i.test(segments[position])) {
                return errorMessage;
            }
            position += 1;
        }
    }

    if (position !== segments.length) {
        return errorMessage;
    }

    // Reject common mistakes (full words instead of locale codes)
    const xIndex = segments.findIndex(s => s.toLowerCase() === 'x');

    const invalidWords = ['english', 'french', 'spanish', 'german', 'italian',
        'chinese', 'japanese', 'korean', 'russian', 'arabic',
        'united', 'states', 'kingdom', 'traditional', 'simplified'];

    for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        // Skip grandfathered prefixes and private use segments
        if (['i', 'x', 'sgn', 'art', 'cel', 'no', 'zh'].includes(segment.toLowerCase())) {
            continue;
        }
        if (xIndex !== -1 && i > xIndex) {
            continue;
        }
        if (segment.length > 16 || invalidWords.includes(segment.toLowerCase())) {
            return errorMessage;
        }
    }

    return null;
};
