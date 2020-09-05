/**
 * Stats
 * A collection of utilities for handling stats of the site
 */
const debug = require('ghost-ignition').debug('stats:cache');
const moment = require('moment');
const models = require('../../models');
const StatsCache = require('./cache');

async function initStats() {
    const result = await models.Post.query(qb => qb.orderBy('created_at', 'ASC').limit(1)).fetchAll({columns: ['created_at']});
    const createdAt = result.models[0].get('created_at');

    const stats = {
        total_members: await models.Member.count(),
        total_posts: await models.Post.count(),
        total_members_posts: await models.Post.where('visibility', 'member').count(),
        total_paid_members_posts: await models.Post.where('visibility', 'paid').count(),
        total_tags: await models.Tag.count(),
        total_authors: await models.Author.count(),
        site_age: Date.now() - createdAt,
        site_age_years: moment(Date.now()).diff(createdAt, 'years')
    };

    debug('Current stats', stats);

    return stats;
}

module.exports = {
    async init() {
        const stats = await initStats();
        StatsCache.init(stats);
    }
};
