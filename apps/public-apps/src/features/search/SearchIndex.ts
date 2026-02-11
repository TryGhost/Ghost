import Flexsearch, {Charset} from 'flexsearch';

interface Post {
    id: string;
    title: string;
    excerpt: string;
    url: string;
}

interface Author {
    id: string;
    name: string;
    profile_image?: string;
    url: string;
}

interface Tag {
    id: string;
    name: string;
    url: string;
}

export interface SearchResults {
    posts: Post[];
    authors: Author[];
    tags: Tag[];
}

// CJK character detection for Chinese/Japanese/Korean support
function isCJK(codePoint: number): boolean {
    return (
        (codePoint >= 0x4E00 && codePoint <= 0x9FFF) || // CJK Unified Ideographs
        (codePoint >= 0x3040 && codePoint <= 0x30FF) || // Hiragana & Katakana
        (codePoint >= 0xAC00 && codePoint <= 0xD7A3) || // Korean Hangul Syllables
        (codePoint >= 0x3400 && codePoint <= 0x4DBF) || // CJK Extension A
        (codePoint >= 0x20000 && codePoint <= 0x2A6DF) || // CJK Extension B
        (codePoint >= 0x2A700 && codePoint <= 0x2EBEF) || // CJK Extensions C-F
        (codePoint >= 0x30000 && codePoint <= 0x323AF) || // Additional ideographs
        (codePoint >= 0x2EBF0 && codePoint <= 0x2EE5F) || // More extensions
        (codePoint >= 0xF900 && codePoint <= 0xFAFF) || // Compatibility Ideographs
        (codePoint >= 0x2F800 && codePoint <= 0x2FA1F) // Supplementary ideographs
    );
}

export function tokenizeCjkByCodePoint(text: string): string[] {
    const result: string[] = [];
    let buffer = '';

    for (const char of text) {
        const codePoint = char.codePointAt(0);

        if (codePoint && isCJK(codePoint)) {
            if (buffer) {
                result.push(buffer);
                buffer = '';
            }
            result.push(char);
        } else {
            buffer += char;
        }
    }

    if (buffer) {
        result.push(buffer);
    }

    return result;
}

const cjkEncoderPresetCodepoint = {
    finalize: (terms: string[]) => {
        const results: string[] = [];
        for (const term of terms) {
            results.push(...tokenizeCjkByCodePoint(term));
        }
        return results;
    }
};

const encoderSet = new Flexsearch.Encoder(
    Charset.Default,
    cjkEncoderPresetCodepoint
);

interface SearchIndexConfig {
    adminUrl: string;
    apiKey?: string;
    dir: 'ltr' | 'rtl';
}

export default class SearchIndex {
    private apiUrl: string;
    private apiKey?: string;
    private postsIndex: Flexsearch.Document<Post>;
    private authorsIndex: Flexsearch.Document<Author>;
    private tagsIndex: Flexsearch.Document<Tag>;

    constructor({adminUrl, apiKey, dir}: SearchIndexConfig) {
        const rtl = dir === 'rtl';
        const tokenize = dir === 'rtl' ? 'reverse' : 'forward';

        this.apiUrl = adminUrl;
        this.apiKey = apiKey;

        this.postsIndex = new Flexsearch.Document({
            tokenize,
            rtl,
            document: {
                id: 'id',
                index: ['title', 'excerpt'],
                store: true
            },
            encoder: encoderSet
        });

        this.authorsIndex = new Flexsearch.Document({
            tokenize,
            rtl,
            document: {
                id: 'id',
                index: ['name'],
                store: true
            },
            encoder: encoderSet
        });

        this.tagsIndex = new Flexsearch.Document({
            tokenize,
            rtl,
            document: {
                id: 'id',
                index: ['name'],
                store: true
            },
            encoder: encoderSet
        });
    }

    async init(): Promise<void> {
        await this.populatePostIndex();
        await this.populateAuthorsIndex();
        await this.populateTagsIndex();
    }

    private async populatePostIndex(): Promise<void> {
        const posts = await this.fetchPosts();
        if (posts.length > 0) {
            posts.forEach((post) => {
                this.postsIndex.add(post);
            });
        }
    }

    private async fetchPosts(): Promise<Post[]> {
        try {
            const url = `${this.apiUrl}/ghost/api/content/search-index/posts/?key=${this.apiKey}`;
            const response = await fetch(url);
            const json = await response.json();
            return json.posts || [];
        } catch (error) {
            console.error('[public-apps] Error fetching posts:', error);
            return [];
        }
    }

    private async populateAuthorsIndex(): Promise<void> {
        const authors = await this.fetchAuthors();
        if (authors.length > 0) {
            authors.forEach((author) => {
                this.authorsIndex.add(author);
            });
        }
    }

    private async fetchAuthors(): Promise<Author[]> {
        try {
            const url = `${this.apiUrl}/ghost/api/content/search-index/authors/?key=${this.apiKey}`;
            const response = await fetch(url);
            const json = await response.json();
            return json.authors || [];
        } catch (error) {
            console.error('[public-apps] Error fetching authors:', error);
            return [];
        }
    }

    private async populateTagsIndex(): Promise<void> {
        const tags = await this.fetchTags();
        if (tags.length > 0) {
            tags.forEach((tag) => {
                this.tagsIndex.add(tag);
            });
        }
    }

    private async fetchTags(): Promise<Tag[]> {
        try {
            const url = `${this.apiUrl}/ghost/api/content/search-index/tags/?key=${this.apiKey}`;
            const response = await fetch(url);
            const json = await response.json();
            return json.tags || [];
        } catch (error) {
            console.error('[public-apps] Error fetching tags:', error);
            return [];
        }
    }

    private normalizeSearchResult<T extends {id: string}>(result: unknown[]): T[] {
        const normalized: T[] = [];
        const usedIds: Record<string, boolean> = {};

        (result as Array<{result: Array<{id: string; doc: T}>}>).forEach((resultItem) => {
            resultItem.result.forEach((doc) => {
                if (!usedIds[doc.id]) {
                    normalized.push(doc.doc);
                    usedIds[doc.id] = true;
                }
            });
        });

        return normalized;
    }

    search(value: string): SearchResults {
        const posts = this.postsIndex.search(value, {enrich: true});
        const authors = this.authorsIndex.search(value, {enrich: true});
        const tags = this.tagsIndex.search(value, {enrich: true});

        return {
            posts: this.normalizeSearchResult<Post>(posts),
            authors: this.normalizeSearchResult<Author>(authors),
            tags: this.normalizeSearchResult<Tag>(tags)
        };
    }
}
