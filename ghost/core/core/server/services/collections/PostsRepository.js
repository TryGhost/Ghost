class PostsRepository {
    constructor({models, moment}) {
        this.models = models;
        this.moment = moment;
    }

    /**
     * @param {Object} options
     * @returns Promise<string[]>
     */
    async getAllIds({transaction} = {}) {
        const query = this.models.Post.query().select('id').where('type', 'post');
        const rows = transaction ? await query.transacting(transaction) : await query;

        return rows.map(row => row.id);
    }
    async getAll({filter, transaction}) {
        const {data: models} = await this.models.Post.findPage({
            filter: `(${filter})+type:post`,
            transacting: transaction,
            limit: 'all',
            status: 'all',
            withRelated: ['tags']
        });

        const json = models.map(m => m.toJSON());

        return json.map((postJson) => {
            return {
                id: postJson.id,
                featured: postJson.featured,
                published_at: this.moment(postJson.published_at).toISOString(true),
                tags: postJson.tags.map(tag => ({
                    slug: tag.slug
                }))
            };
        });
    }
}

module.exports = PostsRepository;

module.exports.getInstance = () => {
    const moment = require('moment-timezone');
    const models = require('../../models');

    return new PostsRepository({models, moment});
};
