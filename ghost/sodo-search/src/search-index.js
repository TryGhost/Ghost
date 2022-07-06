import elasticlunr from 'elasticlunr';

export default class SearchIndex {
    constructor({apiUrl, apiKey, storage = localStorage}) {
        this.apiUrl = apiUrl;
        this.apiKey = apiKey;
        this.storage = storage;

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

        this.storage.setItem('ease_search_index', JSON.stringify(this.postsIndex));
        this.storage.setItem('ease_search_last', data.posts[0].updated_at);
    }

    #updateAuthorsIndex(data) {
        data.authors.forEach((author) => {
            this.authorsIndex.addDoc({
                id: author.id,
                name: author.name
            });
        });
    }

    async init() {
        // remove default stop words to search of *any* word
        elasticlunr.clearStopWords();

        const postsAPIUrl = `${this.apiUrl}/posts/?key=${this.apiKey}&limit=all&fields=id,slug,title,excerpt,url,updated_at,visibility&order=updated_at%20desc&formats=plaintext`;
        const authorsAPIUrl = `${this.apiUrl}/authors/?key=${this.apiKey}&limit=all&fields=id,slug,name,profile_image`;

        const indexDump = JSON.parse(this.storage.getItem('ease_search_index'));

        this.storage.removeItem('ease_index');
        this.storage.removeItem('ease_last');

        if (!indexDump) {
            const postsResponse = await fetch(postsAPIUrl);
            const posts = await postsResponse.json();

            if (posts.posts.length > 0) {
                this.postsIndex = elasticlunr();
                this.postsIndex.addField('title');
                this.postsIndex.addField('excerpt');
                this.postsIndex.setRef('id');

                this.#updatePostIndex(posts);
            }

            const authorsResponse = await fetch(authorsAPIUrl);
            const authors = await authorsResponse.json();

            if (authors.authors.length > 0) {
                this.authorsIndex = elasticlunr();
                this.authorsIndex.addField('name');
                this.authorsIndex.setRef('id');

                this.#updateAuthorsIndex(authors);
            }
        } else {
            this.postsIndex = elasticlunr.Index.load(indexDump);

            return fetch(`${postsAPIUrl}&filter=updated_at:>'${this.storage.getItem('ease_search_last').replace(/\..*/, '').replace(/T/, ' ')}'`
            )
                .then(response => response.json())
                .then((data) => {
                    if (data.posts.length > 0) {
                        this.#updatePostIndex(data);
                    }
                });
        }
    }

    search(value) {
        const posts = this.postsIndex.search(value, {expand: true});
        const authors = this.authorsIndex.search(value, {expand: true});

        return {
            posts: posts.map((doc) => {
                return this.postsIndex.documentStore.docs[doc.ref];
            }),
            authors: authors.map((doc) => {
                return this.authorsIndex.documentStore.docs[doc.ref];
            })
        };
    }
}
