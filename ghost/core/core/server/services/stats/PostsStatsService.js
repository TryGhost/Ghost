class PostsStatsService {
    /**
     * @param {object} deps
     * @param {import('knex').Knex} deps.knex
     **/
    constructor({knex}) {
        this.knex = knex;
    }

    /**
     *
     */
    async getTopPerformingPosts() {
        const limit = 25;
        const knex = this.knex;

        const signupRows = await knex('members_created_events')
            .select(knex.raw('attribution_id as post_id'))
            .select(knex.raw('COUNT(id) as free_members'))
            .where('attribution_type', 'post')
            .groupBy('post_id')
            .orderBy('free_members', "desc")
            .limit(limit);

        const ids = signupRows.map(row => {
            return row.post_id;
        });

        const paidRows = await knex('members_subscription_created_events')
            .select(knex.raw('attribution_id as post_id'))
            .select(knex.raw('COUNT(id) as paid_members'))
            .where('attribution_type', 'post')
            .whereIn('attribution_id', ids)
            .groupBy('post_id');

        const paidRowsMap = new Map();
        for (const row of paidRows) {
            paidRowsMap.set(row.post_id, row.paid_members);
        }

        const mrrRows = await knex('members_subscription_created_events')
            .join('members_paid_subscription_events', 'members_subscription_created_events.subscription_id', 'members_paid_subscription_events.subscription_id')
            .select(knex.raw('attribution_id as post_id'))
            .select(knex.raw('SUM(members_paid_subscription_events.mrr_delta) as mrr'))
            .where('members_subscription_created_events.attribution_type', 'post')
            .whereIn('members_subscription_created_events.attribution_id', ids)
            .groupBy('post_id');

        const mrrRowsMap = new Map();
        for (const row of mrrRows) {
            mrrRowsMap.set(row.post_id, row.mrr);
        }

        const posts = await knex('posts')
            .select('id', 'title')
            .whereIn('id', ids);

        const postsMap = new Map();
        for (const post of posts) {
            postsMap.set(post.id, post);
        }

        const result = [];
        for (const row of signupRows) {
            const post = postsMap.get(row.post_id);
            const paidMembers = paidRowsMap.get(row.post_id) || 0;
            const mrr = mrrRowsMap.get(row.post_id) || 0;
            result.push({
                id: post.id,
                title: post.title,
                free_members: row.free_members,
                paid_members: paidMembers,
                mrr: mrr
            });
        }

        return result;
    }
}

module.exports = PostsStatsService;


/**
 * @typedef {Object} TopPerformingPosts
 * @property {string} id The ID of the post
 * @property {string} title The title of the post
 * @property {string} slug The slug of the post
 * @property {string} free_members_count The number of new free members attributed to the post
 * @property {string} paid_members_count The number of new paid members attributed to the post
 * @property {string} mrr_delta The MRR delta attributed to the post
 */

/**
 * @typedef {Object} TopPerformingPostsItem
 * @property {string} date In YYYY-MM-DD format
 * @property {TopPerformingPosts[]} data List of the top performing posts for each day
 */
