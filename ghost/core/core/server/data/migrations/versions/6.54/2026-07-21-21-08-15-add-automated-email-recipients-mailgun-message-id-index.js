const {createNonTransactionalMigration} = require('../../utils');
const {addIndex, dropIndex} = require('../../../schema/commands');

module.exports = createNonTransactionalMigration(
    async function up(knex) {
        await addIndex('automated_email_recipients', ['mailgun_message_id'], knex, {length: 31});
    },
    async function down(knex) {
        await dropIndex('automated_email_recipients', ['mailgun_message_id'], knex);
    }
);
