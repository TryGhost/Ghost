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
}