module.exports = class CommentsStatsService {
    constructor(deps) {
        this.db = deps.db;
    }

    /**
     * @param {string[]} ids - List of post ids to fetch counts for
     * @returns {Promise<Object<string, number>>}
     */
    async getCountsByPost(ids) {
        const results = await this.db.knex('comments')
            .select(this.db.knex.raw(`COUNT(*) AS count, post_id`))
            .groupBy('post_id')
            .where('status', 'published')
            .whereIn('post_id', ids);

        const counts = ids.reduce((memo, id) => {
            const result = results.find(x => x.post_id === id);
            return {
                ...memo,
                [id]: result?.count || 0
            };
        }, {});

        return counts;
    }

    /**
     * @returns {Promise<Object<string, number>>}
     */
    async getAllCounts() {
        const results = await this.db.knex('comments')
            .select(this.db.knex.raw(`COUNT(*) AS count, post_id`))
            .where('status', 'published')
            .groupBy('post_id');

        /** @type Object<string, number> */
        let counts = {};

        for (const row of results) {
            counts[row.post_id] = row.count;
        }

        return counts;
    }
};
