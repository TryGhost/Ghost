import elasticlunr from 'elasticlunr';

export default class SearchIndex {
    constructor({apiUrl, apiKey}) {
        this.apiUrl = apiUrl;
        this.apiKey = apiKey;

        this.postsIndex = null;
        this.authorsIndex = null;

        this.init = this.init.bind(this);
        this.search = this.search.bind(this);
    }

    #updatePostIndex(data) {
        data.posts.forEach((post) => {
            this.postsIndex.addDoc({
                id: post.id,
                title: post.title,
                excerpt: post.excerpt,
                slug: post.slug
            });
        });
    }

    #updateAuthorsIndex(data) {
        data.authors.forEach((author) => {
            this.authorsIndex.addDoc({
                id: author.id,
                name: author.name
            });
        });
    }

    #updateTagsIndex(data) {
        data.tags.forEach((tag) => {
            this.tagsIndex.addDoc({
                id: tag.id,
                name: tag.name
            });
        });
    }

    async init() {
        // remove default stop words to search of *any* word
        elasticlunr.clearStopWords();

        const postsAPIUrl = `${this.apiUrl}/posts/?key=${this.apiKey}&limit=all&fields=id,slug,title,excerpt,url,updated_at,visibility&order=updated_at%20desc&formats=plaintext`;
        const authorsAPIUrl = `${this.apiUrl}/authors/?key=${this.apiKey}&limit=all&fields=id,slug,name,url,profile_image`;
        const tagsAPIUrl = `${this.apiUrl}/tags/?key=${this.apiKey}&limit=all&fields=id,slug,name,url`;

        const postsResponse = await fetch(postsAPIUrl);
        const posts = await postsResponse.json();

        this.postsIndex = elasticlunr();
        this.postsIndex.addField('title');
        this.postsIndex.addField('url');
        this.postsIndex.addField('excerpt');
        this.postsIndex.setRef('id');

        if (posts.posts.length > 0) {
            this.#updatePostIndex(posts);
        }

        const authorsResponse = await fetch(authorsAPIUrl);
        const authors = await authorsResponse.json();

        this.authorsIndex = elasticlunr();
        this.authorsIndex.addField('name');
        this.authorsIndex.addField('url');
        this.authorsIndex.setRef('id');

        if (authors.authors.length > 0) {
            this.#updateAuthorsIndex(authors);
        }

        const tagsResponse = await fetch(tagsAPIUrl);
        const tags = await tagsResponse.json();

        this.tagsIndex = elasticlunr();
        this.tagsIndex.addField('name');
        this.tagsIndex.addField('url');
        this.tagsIndex.setRef('id');

        if (tags.tags.length > 0) {
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
