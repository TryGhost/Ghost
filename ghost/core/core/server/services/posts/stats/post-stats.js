const db = require('../../../data/db');
class PostStats {
    #db;

    constructor() {
        this.#db = db;
    }

    /**
     * Returns the most recently `published_at` post that was published or sent
     * via email
     */
    async getMostRecentlyPublishedPostDate() {
        const result = await this.#db.knex.select('published_at')
            .from('posts')
            .whereIn('status', ['sent', 'published'])
            .orderBy('published_at', 'desc')
            .limit(1);

        return result?.[0]?.published_at ? new Date(result?.[0]?.published_at) : null;
    }

    /**
     * Returns the first published post date
     */
    async getFirstPublishedPostDate() {
        const result = await this.#db.knex.select('published_at')
            .from('posts')
            .whereIn('status', ['sent', 'published'])
            .orderBy('published_at', 'asc')
            .limit(1);

        return result?.[0]?.published_at ? new Date(result?.[0]?.published_at) : null;
    }

    /**
     * Fetches count of all published posts
     */
    async getTotalPostsPublished() {
        const [result] = await this.#db.knex('posts')
            .whereIn('status', ['sent', 'published'])
            .count('id', {as: 'total'});

        return result.total;
    }
}

module.exports = PostStats;
