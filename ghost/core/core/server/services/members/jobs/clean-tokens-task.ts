import type {Knex} from 'knex';

const debug = require('@tryghost/debug')('jobs:clean-tokens');
const moment = require('moment');

interface CleanTokensDeps {
    db: {knex: Knex};
}

async function cleanTokens({db}: CleanTokensDeps): Promise<number> {
    const cleanupStartDate = new Date();
    debug('Starting cleanup of tokens');

    const d = moment.utc().subtract(24, 'hours');
    const deletedTokens = await db.knex('tokens')
        .where('created_at', '<', d.format('YYYY-MM-DD HH:mm:ss')) // we need to be careful about the type here. .format() is the only thing that works across SQLite and MySQL
        .delete();

    const cleanupEndDate = new Date();
    debug(`Removed ${deletedTokens} tokens created before ${d.toISOString()} in ${cleanupEndDate.valueOf() - cleanupStartDate.valueOf()}ms`);

    return deletedTokens;
}

export default cleanTokens;
