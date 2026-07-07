const StatsService = require('./stats-service');

/**
 * @param {object} deps
 * @param {import('knex').Knex} deps.knex
 * @param {object} deps.models
 * @param {object} deps.urlService
 * @param {object} [deps.cacheAdapter]
 */
module.exports = function createStatsService({knex, models, urlService, cacheAdapter = null}) {
    return {
        api: StatsService.create({
            knex,
            models,
            urlService
        }),
        cache: cacheAdapter,
        init() {}
    };
};
