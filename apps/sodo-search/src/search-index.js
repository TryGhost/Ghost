import {Document} from 'flexsearch';
import GhostContentAPI from '@tryghost/content-api';

export default class SearchIndex {
    constructor({adminUrl, apiKey}) {
        this.api = new GhostContentAPI({
            url: adminUrl,
            key: apiKey,
            version: 'v5.0'
        });

        this.postsIndex = new Document({
            tokenize: 'forward',
            document: {
                id: 'id',
                index: ['title', 'excerpt'],
                store: true
            }
        });
        this.authorsIndex = new Document({
            tokenize: 'forward',
            document: {
                id: 'id',
                index: ['name'],
                store: true
            }
        });
        this.tagsIndex = new Document({
            tokenize: 'forward',
            document: {
                id: 'id',
                index: ['name'],
                store: true
            }
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
