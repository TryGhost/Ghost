const logging = require('@tryghost/logging');
const {createNonTransactionalMigration} = require('../../utils');

const FROM_TABLE = 'welcome_email_automations';
const TO_TABLE = 'automations';

module.exports = createNonTransactionalMigration(
    async function up(connection) {
        const fromExists = await connection.schema.hasTable(FROM_TABLE);
        const toExists = await connection.schema.hasTable(TO_TABLE);

        if (toExists) {
            logging.warn(`Skipping renaming table: ${TO_TABLE} already exists`);
            return;
        }

        if (!fromExists) {
            logging.warn(`Skipping renaming table: ${FROM_TABLE} does not exist`);
            return;
        }

        logging.info(`Renaming table: ${FROM_TABLE} -> ${TO_TABLE}`);
        await connection.schema.renameTable(FROM_TABLE, TO_TABLE);
    },
    async function down(connection) {
        const fromExists = await connection.schema.hasTable(FROM_TABLE);
        const toExists = await connection.schema.hasTable(TO_TABLE);

        if (fromExists) {
            logging.warn(`Skipping renaming table: ${FROM_TABLE} already exists`);
            return;
        }

        if (!toExists) {
            logging.warn(`Skipping renaming table: ${TO_TABLE} does not exist`);
            return;
        }

        logging.info(`Renaming table: ${TO_TABLE} -> ${FROM_TABLE}`);
        await connection.schema.renameTable(TO_TABLE, FROM_TABLE);
    }
);
