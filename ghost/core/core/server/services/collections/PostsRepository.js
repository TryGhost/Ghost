class PostsRepository {
    constructor({models, browsePostsAPI, moment}) {
        this.models = models;
        this.browsePostsAPI = browsePostsAPI;
        this.moment = moment;
    }

    /**
     * @NOTE: This is a copy of the date serialization from Posts Content API.
     *        We need the dates serialized instead of keeping them as plain dates
     *        to be able to apply NQL filtering inside of Collections.
     * @param {Object} attrs
     * @returns
     */
    serializeDates(attrs) {
        const formatDate = (date) => {
            return this.moment(date)
                .toISOString(true);
        };

        ['created_at', 'updated_at', 'published_at'].forEach((field) => {
            if (attrs[field]) {
                attrs[field] = formatDate(attrs[field]);
            }
        });

        return attrs;
    }

    async getAll({filter}) {
        const response = await this.browsePostsAPI({
            options: {
                filter: `(${filter})+type:post`,
                limit: 'all'
            }
        });

        response.posts = response.posts
            .map(this.serializeDates.bind(this));

        return response.posts;
    }

    async getBulk(ids) {
        const response = await this.browsePostsAPI({
            options: {
                filter: `id:[${ids.join(',')}]+type:post`
            }
        });

        response.posts = response.posts
            .map(this.serializeDates.bind(this));

        return response.posts;
    }
}

module.exports = PostsRepository;

module.exports.getInstance = () => {
    const moment = require('moment-timezone');
    const models = require('../../models');
    const browsePostsAPI = async (options) => {
        const rawPosts = await require('../../api/').endpoints.posts.browse.query(options);
        await require('../../api/').endpoints.serializers.output.posts.all(rawPosts, {}, options);

        return options.response;
    };

    return new PostsRepository({models, browsePostsAPI, moment});
};
