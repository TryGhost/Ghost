const logging = require('../../../../../shared/logging');
const {createIrreversibleMigration} = require('../../utils');

const fromTable = 'posts_meta';
const toTable = 'meta';

module.exports = createIrreversibleMigration(async (knex) => {
    logging.info(`Renaming ${fromTable} table to ${toTable}`);

    const hasTable = await knex.schema.hasTable(fromTable);

    if (!hasTable) {
        logging.warn(`No ${fromTable} table found, skipping this migration`);
        return;
    }

    await knex.schema.renameTable(fromTable, toTable);
});
