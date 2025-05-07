import Flexsearch, {Charset} from 'flexsearch';
import GhostContentAPI from '@tryghost/content-api';

/**
 * Custom encoder preset for multilanguage support
 * Original implementation only supported CJK languages
 * Enhanced to support Indic scripts including Punjabi (using Gurmukhi script) and Hindi (using Devanagri script)
 */
const cjkEncoderPresetCodepoint = {
    finalize: (terms) => {
        let results = [];
     
        for (const term of terms) {
            results.push(...tokenizeCjkByCodePoint(term));
        }
        return results;
    }
};

// Keep the original encoder for backward compatibility
const multilanguageEncoderPreset = {
    finalize: (terms) => {
        let results = [];
     
        for (const term of terms) {
            results.push(...tokenizeByCodePoint(term));
        }
        return results;
    }
};

/**
 * Original function (isCJK) has been kept and enhanced with additional script support
 * This function determines whether a Unicode code point belongs to a script 
 * that requires character-by-character tokenization
 */
/**
 * Checks if a Unicode code point belongs to a script that requires special tokenization
 * Original function only checked for CJK characters
 * Enhanced to support Indic scripts (Punjabi/Gurmukhi and Hindi/Devanagari)
 * 
 * @param {Number} codePoint - Unicode code point to check
 * @returns {Boolean} - True if the code point belongs to a special script
 */
function isSpecialScript(codePoint) {
    return (
        // CJK ranges
        (codePoint >= 0x4E00 && codePoint <= 0x9FFF) || // CJK Unified Ideographs
        (codePoint >= 0x3040 && codePoint <= 0x30FF) || // Hiragana & Katakana (contiguous blocks)
        (codePoint >= 0xAC00 && codePoint <= 0xD7A3) || // Korean Hangul Syllables
        (codePoint >= 0x3400 && codePoint <= 0x4DBF) || // CJK Unified Ideographs Extension A
        (codePoint >= 0x20000 && codePoint <= 0x2A6DF) || // CJK Unified Ideographs Extension B
        (codePoint >= 0x2A700 && codePoint <= 0x2EBEF) || // CJK Unified Ideographs Extension C-F (contiguous blocks)
        (codePoint >= 0x30000 && codePoint <= 0x323AF) || // Additional ideographs
        (codePoint >= 0x2EBF0 && codePoint <= 0x2EE5F) || // More extensions
        (codePoint >= 0xF900 && codePoint <= 0xFAFF) || // Compatibility Ideographs
        (codePoint >= 0x2F800 && codePoint <= 0x2FA1F) || // Supplementary ideographs
        
        // Indic scripts support
        (codePoint >= 0x0A00 && codePoint <= 0x0A7F) || // Punjabi (Gurmukhi) Unicode block
        (codePoint >= 0x0900 && codePoint <= 0x097F) || // Hindi (Devanagari) Unicode block
        
        // Common Indic punctuation
        (codePoint >= 0x0964 && codePoint <= 0x0965) // Devanagari Danda and Double Danda (common in Indic scripts)
    );
}
  
// Renamed function to reflect broader language support
/**
 * Original tokenization function for CJK characters
 * Kept for backward compatibility
 * 
 * @param {String} text - Input text to tokenize
 * @returns {Array} - Array of tokens
 */
export function tokenizeCjkByCodePoint(text) {
    const result = [];
    let buffer = '';

    for (const char of text) { // loops over unicode characters
        const codePoint = char.codePointAt(0);

        if (isCJK(codePoint)) {
            if (buffer) {
                result.push(buffer); // Push any non-CJK word we've been building
                buffer = '';
            }
            result.push(char); // Push the CJK char as its own token
        } else {
            buffer += char; // Keep building non-CJK text
        }
    }

    if (buffer) {
        result.push(buffer); // Push whatever is left when done
    }

    return result;
}

/**
 * Enhanced tokenization function that supports multiple scripts
 * including CJK and Indic scripts (Punjabi/Gurmukhi and Hindi/Devanagari)
 * Uses the same logic as the original tokenizeCjkByCodePoint function
 * but with the expanded isSpecialScript check
 * 
 * @param {String} text - Input text to tokenize
 * @returns {Array} - Array of tokens
 */
export function tokenizeByCodePoint(text) {
    const result = [];
    let buffer = '';

    for (const char of text) { // loops over unicode characters
        const codePoint = char.codePointAt(0);

        if (isSpecialScript(codePoint)) {
            if (buffer) {
                result.push(buffer); // Push any non-special script word we've been building
                buffer = '';
            }
            result.push(char); // Push the special script char as its own token
        } else {
            buffer += char; // Keep building non-special script text
        }
    }

    if (buffer) {
        result.push(buffer); // Push whatever is left when done
    }

    return result;
}

/**
 * Function to check if a code point is part of CJK scripts
 * Original function maintained for backwards compatibility
 * 
 * @param {Number} codePoint - Unicode code point to check
 * @returns {Boolean} - True if the code point belongs to a CJK script
 */
function isCJK(codePoint) {
    return (
        (codePoint >= 0x4E00 && codePoint <= 0x9FFF) || // CJK Unified Ideographs
        (codePoint >= 0x3040 && codePoint <= 0x30FF) || // Hiragana & Katakana (contiguous blocks)
        (codePoint >= 0xAC00 && codePoint <= 0xD7A3) || // Korean Hangul Syllables
        (codePoint >= 0x3400 && codePoint <= 0x4DBF) || // CJK Unified Ideographs Extension A
        (codePoint >= 0x20000 && codePoint <= 0x2A6DF) || // CJK Unified Ideographs Extension B
        (codePoint >= 0x2A700 && codePoint <= 0x2EBEF) || // CJK Unified Ideographs Extension C-F (contiguous blocks)
        (codePoint >= 0x30000 && codePoint <= 0x323AF) || // Additional ideographs
        (codePoint >= 0x2EBF0 && codePoint <= 0x2EE5F) || // More extensions
        (codePoint >= 0xF900 && codePoint <= 0xFAFF) || // Compatibility Ideographs
        (codePoint >= 0x2F800 && codePoint <= 0x2FA1F) // Supplementary ideographs
    );
}

// Original encoder maintained for backwards compatibility
const encoderSet = new Flexsearch.Encoder(
    Charset.Default,
    cjkEncoderPresetCodepoint
);

/**
 * Enhanced encoder that supports multiple scripts including Indic languages
 * Use this encoder for multilingual search support
 */
const multiScriptEncoderSet = new Flexsearch.Encoder(
    Charset.Default,
    multilanguageEncoderPreset
);

/**
 * Class for creating and managing search indices for Ghost CMS content
 * Enhanced to support multilingual search including Indic scripts
 */
export default class SearchIndex {
    /**
     * Constructor for SearchIndex
     * 
     * @param {Object} options - Configuration options
     * @param {String} options.adminUrl - Ghost CMS admin URL
     * @param {String} options.apiKey - Ghost CMS API key
     * @param {String} options.dir - Text direction ('rtl' or 'ltr')
     * @param {Boolean} options.useMultiScriptEncoder - Whether to use the enhanced multilingual encoder (default: false)
     */
    constructor({adminUrl, apiKey, dir, useMultiScriptEncoder = false}) {
        this.api = new GhostContentAPI({
            url: adminUrl,
            key: apiKey,
            version: 'v5.0'
        });
        const rtl = (dir === 'rtl');
        const tokenize = (dir === 'rtl') ? 'reverse' : 'forward';
        
        // Select the appropriate encoder based on configuration
        const selectedEncoder = useMultiScriptEncoder ? multiScriptEncoderSet : encoderSet;
        
        this.postsIndex = new Flexsearch.Document({
            tokenize: tokenize,
            rtl: rtl,
            document: {
                id: 'id',
                index: ['title', 'excerpt'],
                store: true
            },
            encoder: selectedEncoder
        });
        this.authorsIndex = new Flexsearch.Document({
            tokenize: tokenize,
            rtl: rtl,
            document: {
                id: 'id',
                index: ['name'],
                store: true
            },
            encoder: selectedEncoder
        });
        this.tagsIndex = new Flexsearch.Document({
            tokenize: tokenize,
            rtl: rtl,
            document: {
                id: 'id',
                index: ['name'],
                store: true
            },
            encoder: selectedEncoder
        });

        this.init = this.init.bind(this);
        this.search = this.search.bind(this);
    }

    /**
     * Update the posts index with new posts
     * 
     * @param {Array} posts - Array of post objects to index
     * @private
     */
    #updatePostIndex(posts) {
        posts.forEach((post) => {
            this.postsIndex.add(post);
        });
    }

    /**
     * Update the authors index with new authors
     * 
     * @param {Array} authors - Array of author objects to index
     * @private
     */
    #updateAuthorsIndex(authors) {
        authors.forEach((author) => {
            this.authorsIndex.add(author);
        });
    }

    /**
     * Update the tags index with new tags
     * 
     * @param {Array} tags - Array of tag objects to index
     * @private
     */
    #updateTagsIndex(tags) {
        tags.forEach((tag) => {
            this.tagsIndex.add(tag);
        });
    }

    /**
     * Initialize the search indices by fetching and indexing posts, authors, and tags
     * from the Ghost CMS API
     * 
     * @returns {Promise<void>}
     */
    async init() {
        let posts = await this.api.posts.browse({
            limit: '10000',
            fields: 'id,slug,title,excerpt,url,updated_at,visibility',
            order: 'updated_at DESC'
        });

        if (posts || posts.length > 0) {
            if (!posts.length) {
                posts = [posts];
            }
            this.#updatePostIndex(posts);
        }

        let authors = await this.api.authors.browse({
            limit: '10000',
            fields: 'id,slug,name,url,profile_image',
            order: 'updated_at DESC'
        });

        if (authors || authors.length > 0) {
            if (!authors.length) {
                authors = [authors];
            }

            this.#updateAuthorsIndex(authors);
        }

        let tags = await this.api.tags.browse({
            limit: '10000',
            fields: 'id,slug,name,url',
            order: 'updated_at DESC',
            filter: 'visibility:public'
        });

        if (tags || tags.length > 0) {
            if (!tags.length) {
                tags = [tags];
            }

            this.#updateTagsIndex(tags);
        }
    }

    /**
     * Normalize search results by removing duplicates
     * 
     * @param {Array} result - Raw search results from FlexSearch
     * @returns {Array} - Normalized array of search results without duplicates
     * @private
     */
    #normalizeSearchResult(result) {
        const normalized = [];
        const usedIds = {};

        result.forEach((resultItem) => {
            resultItem.result.forEach((doc) => {
                if (!usedIds[doc.id]) {
                    normalized.push(doc.doc);
                    usedIds[doc.id] = true;
                }
            });
        });

        return normalized;
    }

    /**
     * Search for content across posts, authors, and tags
     * The search supports multilingual content including Indic scripts when
     * the multiScriptEncoderSet is used
     * 
     * @param {String} value - Search query
     * @returns {Object} - Object containing search results for posts, authors, and tags
     */
    search(value) {
        const posts = this.postsIndex.search(value, {
            enrich: true
        });
        const authors = this.authorsIndex.search(value, {
            enrich: true
        });
        const tags = this.tagsIndex.search(value, {
            enrich: true
        });

        return {
            posts: this.#normalizeSearchResult(posts),
            authors: this.#normalizeSearchResult(authors),
            tags: this.#normalizeSearchResult(tags)
        };
    }
}
