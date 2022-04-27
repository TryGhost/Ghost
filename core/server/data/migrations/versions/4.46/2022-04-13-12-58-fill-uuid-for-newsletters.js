const logging = require('@tryghost/logging');
const uuid = require('uuid');

const {createTransactionalMigration} = require('../../utils');

module.exports = createTransactionalMigration(
    async function up(knex) {
        logging.info('Setting missing uuid values for existing newsletters');
        const uuidV4 = uuid.v4();
        const updatedRows = await knex('newsletters')
            .where('uuid', null)
            .update('uuid', uuidV4);

        logging.info(`Updated ${updatedRows} newsletters with uuidV4 = ${uuidV4}`);
    },
    async function down() {
        // Not required: we would lose information here.
    }
);
