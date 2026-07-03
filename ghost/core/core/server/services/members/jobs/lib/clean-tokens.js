const debug = require('@tryghost/debug')('jobs:clean-tokens');
const moment = require('moment');

/**
 * Delete single-use tokens older than 24 hours. Idempotent — safe to re-run.
 * @param {{knex: Function}} db
 * @returns {Promise<number>} number of tokens deleted
 */
module.exports = async function cleanTokens(db) {
    const cleanupStartDate = new Date();
    debug('Starting cleanup of tokens');

    // We delete all tokens that are older than 24 hours.
    const d = moment.utc().subtract(24, 'hours');
    const deletedTokens = await db.knex('tokens')
        .where('created_at', '<', d.format('YYYY-MM-DD HH:mm:ss')) // we need to be careful about the type here. .format() is the only thing that works across SQLite and MySQL
        .delete();

    const cleanupEndDate = new Date();
    debug(`Removed ${deletedTokens} tokens created before ${d.toISOString()} in ${cleanupEndDate.valueOf() - cleanupStartDate.valueOf()}ms`);

    return deletedTokens;
};
