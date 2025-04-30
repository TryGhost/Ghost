import Flexsearch, {Charset} from 'flexsearch';
import GhostContentAPI from '@tryghost/content-api';

const cjkEncoderPresetCodepoint = {
    finalize: (terms) => {
        let results = [];
     
        for (const term of terms) {
            results.push(...tokenizeCjkByCodePoint(term));
        }
        return results;
    }
};

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
  
export function tokenizeCjkByCodePoint(text) {
    const result = [];
    let buffer = '';

    for (const char of text) { // loops over unicode characters
        const codePoint = char.codePointAt(0);

        if (isCJK(codePoint)) {
            if (buffer) {
                result.push(buffer); // Push any non-CJK word we’ve been building
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

const encoderSet = new Flexsearch.Encoder(
    Charset.Default,
    cjkEncoderPresetCodepoint
);

export default class SearchIndex {
    constructor({adminUrl, apiKey, dir}) {
        this.api = new GhostContentAPI({
            url: adminUrl,
            key: apiKey,
            version: 'v5.0'
        });
        const rtl = (dir === 'rtl');
        const tokenize = (dir === 'rtl') ? 'reverse' : 'forward';
        this.postsIndex = new Flexsearch.Document({
            tokenize: tokenize,
            rtl: rtl,
            document: {
                id: 'id',
                index: ['title', 'excerpt'],
                store: true
            },
            encoder: encoderSet
        });
        this.authorsIndex = new Flexsearch.Document({
            tokenize: tokenize,
            rtl: rtl,
            document: {
                id: 'id',
                index: ['name'],
                store: true
            },
            encoder: encoderSet
        });
        this.tagsIndex = new Flexsearch.Document({
            tokenize: tokenize,
            rtl: rtl,
            document: {
                id: 'id',
                index: ['name'],
                store: true
            },
            encoder: encoderSet
        });

        this.init = this.init.bind(this);
        this.search = this.search.bind(this);
    }

    #updatePostIndex(posts) {
        posts.forEach((post) => {
            this.postsIndex.add(post);
        });
    }

    #updateAuthorsIndex(authors) {
        authors.forEach((author) => {
            this.authorsIndex.add(author);
        });
    }

    #updateTagsIndex(tags) {
        tags.forEach((tag) => {
            this.tagsIndex.add(tag);
        });
    }

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