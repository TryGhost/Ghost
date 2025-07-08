export const validateLocale = (value: string): string | null => {
    const errorMessage = 'Invalid locale format. Examples: en, pt-BR, zh-Hant, sr-Cyrl, x-private';

    if (!value) {
        return 'Locale is required';
    }

    // Trim whitespace
    const trimmedValue = value.trim();
    
    if (!trimmedValue) {
        return errorMessage;
    }

    // Grandfathered irregular tags (exact matches, case insensitive)
    const grandfatheredIrregular = [
        'en-gb-oed', 'i-ami', 'i-bnn', 'i-default', 'i-enochian', 'i-hak',
        'i-klingon', 'i-lux', 'i-mingo', 'i-navajo', 'i-pwn', 'i-tao',
        'i-tay', 'i-tsu', 'sgn-be-fr', 'sgn-be-nl', 'sgn-ch-de'
    ];
    
    // Grandfathered regular tags (exact matches, case insensitive)
    const grandfatheredRegular = [
        'art-lojban', 'cel-gaulish', 'no-bok', 'no-nyn', 'zh-guoyu',
        'zh-hakka', 'zh-min', 'zh-min-nan', 'zh-xiang'
    ];
    
    // Check grandfathered tags
    const lowerValue = trimmedValue.toLowerCase();
    if (grandfatheredIrregular.includes(lowerValue) || 
        grandfatheredRegular.includes(lowerValue)) {
        return null;
    }
    
    // Basic format validation - only alphanumeric and hyphens
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/i.test(trimmedValue)) {
        return errorMessage;
    }
    
    // Reject if any segment is empty
    if (trimmedValue.includes('--') || trimmedValue.startsWith('-') || trimmedValue.endsWith('-')) {
        return errorMessage;
    }
    
    const segments = trimmedValue.split('-');
    
    // Private use tags (x-something)
    if (segments[0].toLowerCase() === 'x') {
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
        // Check for extension singleton
        if (/^[0-9a-wy-z]$/i.test(segments[position])) {
            position += 1;
            // Must have at least one extension subtag
            if (position >= segments.length || !/^[a-z0-9]{2,8}$/i.test(segments[position])) {
                return errorMessage;
            }
            position += 1;
            // Additional extension subtags
            while (position < segments.length && /^[a-z0-9]{2,8}$/i.test(segments[position])) {
                position += 1;
            }
        } else {
            break;
        }
    }
    
    // Private use at the end (optional): x + one or more 1-8 char subtags
    if (position < segments.length && segments[position].toLowerCase() === 'x') {
        position += 1;
        if (position >= segments.length) {
            return errorMessage;
        }
        while (position < segments.length) {
            // Private use subtags can be 1-8 characters, but we'll be lenient and allow longer
            if (!/^[a-z0-9]+$/i.test(segments[position])) {
                return errorMessage;
            }
            position += 1;
        }
    }
    
    // If we haven't consumed all segments, the format is invalid
    if (position !== segments.length) {
        return errorMessage;
    }
    
    // Additional validation for common mistakes
    // Check if any segment looks like a full word rather than a code
    for (const segment of segments) {
        // Skip grandfathered prefixes and private use
        if (['i', 'x', 'sgn', 'art', 'cel', 'no', 'zh'].includes(segment.toLowerCase())) {
            continue;
        }
        // Skip segments in private use (after 'x')
        const xIndex = segments.indexOf('x');
        if (xIndex !== -1 && segments.indexOf(segment) > xIndex) {
            continue;
        }
        // Reject segments that are obviously too long (but be lenient for private use)
        if (segment.length > 16) {
            return errorMessage;
        }
        // Common English words that might be mistakenly used
        const invalidWords = ['english', 'french', 'spanish', 'german', 'italian', 
            'chinese', 'japanese', 'korean', 'russian', 'arabic',
            'united', 'states', 'kingdom', 'traditional', 'simplified'];
        if (invalidWords.includes(segment.toLowerCase())) {
            return errorMessage;
        }
    }
    
    return null;
};