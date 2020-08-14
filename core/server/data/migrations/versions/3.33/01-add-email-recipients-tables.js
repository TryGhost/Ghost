const logging = require('../../../../../shared/logging');
const commands = require('../../../schema').commands;

const TABLES = ['email_batches', 'email_recipients'];

module.exports = {
    async up({connection}) {
        return Promise.each(TABLES, async (table) => {
            const tableExists = await connection.schema.hasTable(table);

            if (tableExists) {
                return logging.warn(`Adding table: ${table}`);
            }

            logging.info(`Adding table: ${table}`);
            return commands.createTable(table, connection);
        });
    },

    async down({connection}) {
        return Promise.each(TABLES.reverse(), async (table) => {
            const tableExists = await connection.schema.hasTable(table);

            if (!tableExists) {
                return logging.warn(`Dropping table: ${table}`);
            }

            logging.info(`Dropping table: ${table}`);
            return commands.deleteTable(table, connection);
        });
    }
};
