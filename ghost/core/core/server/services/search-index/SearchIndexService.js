module.exports = class SearchIndexService {
    constructor({PostsService, models}) {
        this.PostsService = PostsService;
        this.models = models;
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

    async fetchAuthors() {
        const options = {
            limit: '10000',
            order: 'updated_at DESC',
            columns: ['id', 'slug', 'name', 'url', 'profile_image']
        };

        const authors = await this.models.Author.findPage(options);

        return authors;
    }

    async fetchTags() {
        const options = {
            limit: '10000',
            order: 'updated_at DESC',
            columns: ['id', 'slug', 'name', 'url'],
            filter: 'visibility:public'
        };

        const tags = await this.models.Tag.findPage(options);

        return tags;
    }
};
