module.exports = class SearchIndexService {
    constructor({PostsService}) {
        this.PostsService = PostsService;
    }

    async fetchPosts() {
        const options = {
            limit: '10000',
            order: 'updated_at DESC',
            columns: ['id', 'slug', 'title', 'excerpt', 'url', 'created_at', 'updated_at', 'published_at', 'visibility']
        };

        const posts = await this.PostsService.browsePosts(options);
        return posts;
    }
};
