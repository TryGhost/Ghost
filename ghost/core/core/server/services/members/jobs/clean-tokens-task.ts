import type {Knex} from 'knex';

const moment = require('moment');

interface CleanTokensDeps {
    db: {knex: Knex};
}

async function cleanTokens({db}: CleanTokensDeps): Promise<number> {
    const d = moment.utc().subtract(24, 'hours');
    const deletedTokens = await db.knex('tokens')
        .where('created_at', '<', d.format('YYYY-MM-DD HH:mm:ss')) // we need to be careful about the type here. .format() is the only thing that works across SQLite and MySQL
        .delete();

    return deletedTokens;
}

export default cleanTokens;
