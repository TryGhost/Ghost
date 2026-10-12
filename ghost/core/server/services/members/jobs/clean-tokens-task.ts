import type { Knex } from 'knex';

const moment = require('moment');

interface CleanTokensDeps {
  db: { knex: Knex };
  logging: { info(...args: unknown[]): void };
}

async function cleanTokens({ db, logging }: CleanTokensDeps): Promise<number> {
  const d = moment.utc().subtract(24, 'hours');
  const deletedTokens = await db
    .knex('tokens')
    .where('created_at', '<', d.format('YYYY-MM-DD HH:mm:ss')) // we need to be careful about the type here. .format() is the only thing that works across SQLite and MySQL
    .delete();

  logging.info(
    {
      system: {
        event: 'clean_tokens.completed',
        deleted_count: deletedTokens,
      },
    },
    `[Background Job] clean-tokens removed ${deletedTokens} tokens older than 24 hours`,
  );

  return deletedTokens;
}

export default cleanTokens;
