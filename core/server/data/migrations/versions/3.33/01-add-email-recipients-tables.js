const logging = require('../../../../../shared/logging');
const commands = require('../../../schema').commands;

module.exports = {
    async up({connection}) {
        // table creation order is important because of foreign key constraints,
        // email_recipients references email_batches so email_batches has to exist when creating
        return Promise.each(['email_batches', 'email_recipients'], async (table) => {
            const tableExists = await connection.schema.hasTable(table);

            if (tableExists) {
                return logging.warn(`Skipping add table "${table}" - already exists`);
            }

            logging.info(`Adding table: ${table}`);
            return commands.createTable(table, connection);
        });
    },

    async down({connection}) {
        // table deletion order is important because of foreign key constraints,
        // email_recipients references email_batches so it has to be deleted first to not break constraints
        return Promise.each(['email_recipients', 'email_batches'], async (table) => {
            const tableExists = await connection.schema.hasTable(table);

            if (!tableExists) {
                return logging.warn(`Skipping drop table "${table}" - does not exist`);
            }

            logging.info(`Dropping table: ${table}`);
            return commands.deleteTable(table, connection);
        });
    }
};
