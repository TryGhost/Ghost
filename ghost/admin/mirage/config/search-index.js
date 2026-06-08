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

    server.get('/search-index/tags', function ({tags}) {
        const searchTags = tags.all().models.map((tag) => {
            const url = `http://localhost:4200/tag/${tag.slug}/`;

            return {
                id: tag.id,
                slug: tag.slug,
                name: tag.name,
                url: url
            };
        });

        return {
            tags: searchTags
        };
    });

    server.get('/search-index/users', function ({users}) {
        const searchUsers = users.all().models.map((user) => {
            const url = `http://localhost:4200/user/${user.slug}/`;

            return {
                id: user.id,
                slug: user.slug,
                name: user.name,
                url: url,
                profile_image: user.profileImage
            };
        });

        return {
            users: searchUsers
        };
    });
}
