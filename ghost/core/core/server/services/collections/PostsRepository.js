class PostsRepository {
    constructor({models, browsePostsAPI}) {
        this.models = models;
        this.browsePostsAPI = browsePostsAPI;
    }

    async getAll({filter}) {
        const posts = await this.models.Post.findAll({
            // @NOTE: enforce "post" type to avoid ever fetching pages
            filter: `(${filter})+type:post`
        });

        return posts.toJSON();
    }

    async getBulk(ids) {
        const response = await this.browsePostsAPI({
            options: {
                filter: `id:[${ids.join(',')}]+type:post`
            }
        });

        return response.posts;
    }
}

module.exports = PostsRepository;

module.exports.getInstance = () => {
    const models = require('../../models');
    const browsePostsAPI = async (options) => {
        const rawPosts = await require('../../api/').endpoints.posts.browse.query(options);
        await require('../../api/').endpoints.serializers.output.posts.all(rawPosts, {}, options);

        return options.response;
    };

    return new PostsRepository({models, browsePostsAPI});
};
