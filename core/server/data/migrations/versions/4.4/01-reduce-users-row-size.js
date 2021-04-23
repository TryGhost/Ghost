const logging = require('../../../../../shared/logging');
const {createNonTransactionalMigration} = require('../../utils');

module.exports = createNonTransactionalMigration(
    async function up(connection) {
        if (connection.client.config.client !== 'mysql') {
            logging.info('Skipping changing users string records to text for non MySQL databases');
            return;
        }
        logging.info('Updating users string records to text.');

        await connection.raw('ALTER TABLE users MODIFY profile_image TEXT;');
        await connection.raw('ALTER TABLE users MODIFY cover_image TEXT;');
        await connection.raw('ALTER TABLE users MODIFY website TEXT;');
        await connection.raw('ALTER TABLE users MODIFY facebook TEXT;');
        await connection.raw('ALTER TABLE users MODIFY twitter TEXT;');

        logging.info('Updated users string records to text.');
    },

    async function down(connection) {
        if (connection.client.config.client !== 'mysql') {
            logging.info('Skipping changing text records back to string for non MySQL databases');
            return;
        }
        logging.info('Updating users text records back to string.');

        await connection.raw('ALTER TABLE users MODIFY profile_image VARCHAR(2000);');
        await connection.raw('ALTER TABLE users MODIFY cover_image VARCHAR(2000);');
        await connection.raw('ALTER TABLE users MODIFY website VARCHAR(2000);');
        await connection.raw('ALTER TABLE users MODIFY facebook VARCHAR(2000);');
        await connection.raw('ALTER TABLE users MODIFY twitter VARCHAR(2000);');

        logging.info('Updated users text records back to string.');
    }
);
