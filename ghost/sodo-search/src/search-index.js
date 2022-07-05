import elasticlunr from 'elasticlunr';

export default class SearchIndex {
    constructor({apiUrl, apiKey, storage = localStorage}) {
        this.apiUrl = apiUrl;
        this.apiKey = apiKey;
        this.storage = storage;

        this.postsIndex = null;

        this.init = this.init.bind(this);
        this.search = this.search.bind(this);
    }

    #updateIndex(data) {
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

    async init() {
        // remove default stop words to search of *any* word
        elasticlunr.clearStopWords();

        const url = `${this.apiUrl}/posts/?key=${this.apiKey}&limit=all&fields=id,slug,title,excerpt,url,updated_at,visibility&order=updated_at%20desc&formats=plaintext`;

        const indexDump = JSON.parse(this.storage.getItem('ease_search_index'));

        this.storage.removeItem('ease_index');
        this.storage.removeItem('ease_last');

        if (!indexDump) {
            return fetch(url)
                .then(response => response.json())
                .then((data) => {
                    if (data.posts.length > 0) {
                        this.postsIndex = elasticlunr();
                        this.postsIndex.addField('title');
                        this.postsIndex.addField('excerpt');
                        this.postsIndex.setRef('id');

                        this.#updateIndex(data);
                    }
                });
        } else {
            this.postsIndex = elasticlunr.Index.load(indexDump);

            return fetch(`${url}&filter=updated_at:>'${this.storage.getItem('ease_search_last').replace(/\..*/, '').replace(/T/, ' ')}'`
            )
                .then(response => response.json())
                .then((data) => {
                    if (data.posts.length > 0) {
                        this.#updateIndex(data);
                    }
                });
        }
    }

    search(value) {
        const posts = this.postsIndex.search(value, {expand: true});
        return {
            posts: posts.map((doc) => {
                return this.postsIndex.documentStore.docs[doc.ref];
            })
        };
    }
}
