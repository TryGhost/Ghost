export default function mockSearchIndex(server) {
    server.get('/search-index/posts', function ({posts}) {
        const searchPosts = posts.all().models.map((post, index) => {
            const url = `http://localhost:4200/p/post-${index}/`;

            return {
                id: post.id,
                url: url,
                title: post.title,
                status: post.status,
                published_at: post.publishedAt,
                visibility: post.visibility
            };
        });

        return {
            posts: searchPosts
        };
    });

    server.get('/search-index/pages', function ({pages}) {
        const searchPages = pages.all().models.map((page, index) => {
            const url = `http://localhost:4200/p/page-${index}/`;

            return {
                id: page.id,
                url: url,
                title: page.title,
                status: page.status,
                published_at: page.publishedAt,
                visibility: page.visibility
            };
        });

        return {
            pages: searchPages
        };
    });
}
