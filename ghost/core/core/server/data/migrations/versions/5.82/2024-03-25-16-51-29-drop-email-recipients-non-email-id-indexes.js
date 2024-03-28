// For information on writing migrations, see https://www.notion.so/ghost/Database-migrations-eb5b78c435d741d2b34a582d57c24253

const {createNonTransactionalMigration} = require('../../utils');
const commands = require('../../../schema/commands');

module.exports = createNonTransactionalMigration(
    async function up(knex) {
        await commands.dropIndex('email_recipients', ['delivered_at'], knex);
        await commands.dropIndex('email_recipients', ['opened_at'], knex);
        await commands.dropIndex('email_recipients', ['failed_at'], knex);
    },
    async function down(knex) {
        await commands.addIndex('email_recipients', ['delivered_at'], knex);
        await commands.addIndex('email_recipients', ['opened_at'], knex);
        await commands.addIndex('email_recipients', ['failed_at'], knex);
    }
);
