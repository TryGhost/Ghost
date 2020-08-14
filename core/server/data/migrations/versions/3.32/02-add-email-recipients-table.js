const logging = require('../../../../../shared/logging');
const commands = require('../../../schema').commands;
const table = 'email_recipients';

module.exports = {
    async up({connection}) {
        const tableExists = await connection.schema.hasTable(table);

        if (tableExists) {
            return logging.warn(`Adding table: ${table}`);
        }

        logging.info(`Adding table: ${table}`);
        return commands.createTable(table, connection);
    },

    async down({connection}) {
        const tableExists = await connection.schema.hasTable(table);

        if (!tableExists) {
            return logging.warn(`Dropping table: ${table}`);
        }

        logging.info(`Dropping table: ${table}`);
        return commands.deleteTable(table, connection);
    }
};
