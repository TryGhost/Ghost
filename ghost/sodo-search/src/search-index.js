import elasticlunr from 'elasticlunr';
import GhostContentAPI from '@tryghost/content-api';

export default class SearchIndex {
    constructor({adminUrl, apiKey}) {
        this.api = new GhostContentAPI({
            url: adminUrl,
            key: apiKey,
            version: 'v5.0'
        });

        this.postsIndex = null;
        this.authorsIndex = null;

        this.init = this.init.bind(this);
        this.search = this.search.bind(this);
    }

    #updatePostIndex(posts) {
        posts.forEach((post) => {
            this.postsIndex.addDoc({
                id: post.id,
                title: post.title,
                excerpt: post.excerpt,
                slug: post.slug,
                url: post.url
            });
        });
    }

    #updateAuthorsIndex(authors) {
        authors.forEach((author) => {
            this.authorsIndex.addDoc({
                id: author.id,
                name: author.name,
                url: author.url,
                profile_image: author.profile_image
            });
        });
    }

    #updateTagsIndex(tags) {
        tags.forEach((tag) => {
            this.tagsIndex.addDoc({
                id: tag.id,
                name: tag.name,
                url: tag.url
            });
        });
    }

    async init() {
        // remove default stop words to search of *any* word
        elasticlunr.clearStopWords();

        let posts = await this.api.posts.browse({
            limit: 'all',
            fields: 'id,slug,title,excerpt,url,updated_at,visibility',
            order: 'updated_at DESC',
            formats: 'plaintext'
        });

        this.postsIndex = elasticlunr();
        this.postsIndex.addField('title');
        this.postsIndex.addField('url');
        this.postsIndex.addField('excerpt');
        this.postsIndex.setRef('id');

        if (posts || posts.length > 0) {
            if (!posts.length) {
                posts = [posts];
            }
            this.#updatePostIndex(posts);
        }

        let authors = await this.api.authors.browse({
            limit: 'all',
            fields: 'id,slug,name,url,profile_image'
        });

        this.authorsIndex = elasticlunr();
        this.authorsIndex.addField('name');
        this.authorsIndex.addField('url');
        this.authorsIndex.addField('profile_image');
        this.authorsIndex.setRef('id');

        if (authors || authors.length > 0) {
            if (!authors.length) {
                authors = [authors];
            }

            this.#updateAuthorsIndex(authors);
        }

        let tags = await this.api.tags.browse({
            limit: 'all',
            fields: 'id,slug,name,url'
        });
        this.tagsIndex = elasticlunr();
        this.tagsIndex.addField('name');
        this.tagsIndex.addField('url');
        this.tagsIndex.setRef('id');

        if (tags || tags.length > 0) {
            if (!tags.length) {
                tags = [tags];
            }

            this.#updateTagsIndex(tags);
        }
    }

    search(value) {
        const posts = this.postsIndex.search(value, {
            fields: {
                title: {boost: 1},
                excerpt: {boost: 1}
            },
            expand: true
        });
        const authors = this.authorsIndex.search(value, {
            fields: {
                name: {boost: 1}
            },
            expand: true
        });
        const tags = this.tagsIndex.search(value, {
            fields: {
                name: {boost: 1}
            },
            expand: true
        });

        return {
            posts: posts.map((doc) => {
                return this.postsIndex.documentStore.docs[doc.ref];
            }),
            authors: authors.map((doc) => {
                return this.authorsIndex.documentStore.docs[doc.ref];
            }),
            tags: tags.map((doc) => {
                return this.tagsIndex.documentStore.docs[doc.ref];
            })
        };
    }
}
