// For information on writing migrations, see https://www.notion.so/ghost/Database-migrations-eb5b78c435d741d2b34a582d57c24253

const logging = require('@tryghost/logging');
const {createNonTransactionalMigration} = require('../../utils');
const {addIndex, dropIndex} = require('../../../schema/commands');
const errors = require('@tryghost/errors');

module.exports = createNonTransactionalMigration(
    async function up(knex) {
        logging.info('Adding index to redirects.from');

        const columnInfo = await knex('redirects').columnInfo('from');
        // knex is wrong; it's returning a string not a number so we re-cast it to satisfy the type checker
        if (columnInfo.maxLength.toString() !== '191') {
            logging.error(`Column length is not 191. Ensure the previous migration has been applied successfully. Column info: ${JSON.stringify(columnInfo)}`);
            throw new errors.MigrationError({
                message: 'Column length is not 191. Ensure the previous migration has been applied successfully.'
            });
        }

        await addIndex('redirects', ['from'], knex);
    },
    async function down(knex) {
        logging.info('Removing index from redirects.from');
        try {
            await dropIndex('redirects', ['from'], knex);
        } catch (error) {
            logging.error(`Error removing index from redirects.from: ${error}`);
        }
    }
);
