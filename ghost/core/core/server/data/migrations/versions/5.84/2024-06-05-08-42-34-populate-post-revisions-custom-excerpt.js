const logging = require('@tryghost/logging');
const {createTransactionalMigration} = require('../../utils');

module.exports = createTransactionalMigration(
    async function up() {
        logging.warn('Skipping migration - noop');
    },
    async function down() {
        // Not required
    }
);
