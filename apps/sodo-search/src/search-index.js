import Flexsearch from 'flexsearch';
import GhostContentAPI from '@tryghost/content-api';

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
            ...this.#getEncodeOptions()
        });
        this.authorsIndex = new Flexsearch.Document({
            tokenize: tokenize,
            rtl: rtl,
            document: {
                id: 'id',
                index: ['name'],
                store: true
            },
            ...this.#getEncodeOptions()
        });
        this.tagsIndex = new Flexsearch.Document({
            tokenize: tokenize,
            rtl: rtl,
            document: {
                id: 'id',
                index: ['name'],
                store: true
            },
            ...this.#getEncodeOptions()
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

    #getEncodeOptions() {
        const regex = new RegExp(
            `[\u{4E00}-\u{9FFF}\u{3040}-\u{309F}\u{30A0}-\u{30FF}\u{AC00}-\u{D7A3}\u{3400}-\u{4DBF}\u{20000}-\u{2A6DF}\u{2A700}-\u{2B73F}\u{2B740}-\u{2B81F}\u{2B820}-\u{2CEAF}\u{2CEB0}-\u{2EBEF}\u{30000}-\u{3134F}\u{31350}-\u{323AF}\u{2EBF0}-\u{2EE5F}\u{F900}-\u{FAFF}\u{2F800}-\u{2FA1F}]|[0-9A-Za-zа-я\u00C0-\u017F\u0400-\u04FF\u0600-\u06FF\u0980-\u09FF\u1E00-\u1EFF\u0590-\u05FF]+`,
            'mug'
        );

        return {
            encode: (str) => {
                return ('' + str).toLowerCase().match(regex) ?? [];
            }
        };
    }
}
