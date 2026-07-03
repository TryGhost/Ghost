const logging = require('@tryghost/logging');
const {createNonTransactionalMigration} = require('../../utils');
const {addColumn, addIndex, createColumnMigration, dropColumn, dropIndex} = require('../../../schema/commands');

const table = 'automated_email_recipients';

const columns = {
    mailgun_message_id: {type: 'string', maxlength: 255, nullable: true},
    delivered_at: {type: 'dateTime', nullable: true},
    opened_at: {type: 'dateTime', nullable: true}
};

async function runIfTableExists(knex, operation) {
    const tableExists = await knex.schema.hasTable(table);

    if (!tableExists) {
        logging.warn(`Skipping automated email recipient analytics columns migration - ${table} table does not exist`);
        return;
    }

    await operation(knex);
}

const addColumns = createColumnMigration(
    ...Object.entries(columns).map(([column, columnDefinition]) => ({
        table,
        column,
        dbIsInCorrectState: hasColumn => hasColumn === true,
        operation: addColumn,
        operationVerb: 'Adding',
        columnDefinition
    }))
);

const dropColumns = createColumnMigration(
    ...Object.entries(columns).reverse().map(([column, columnDefinition]) => ({
        table,
        column,
        dbIsInCorrectState: hasColumn => hasColumn === false,
        operation: dropColumn,
        operationVerb: 'Removing',
        columnDefinition
    }))
);

module.exports = createNonTransactionalMigration(
    async function up(knex) {
        await runIfTableExists(knex, async () => {
            await addColumns(knex);
            await addIndex(table, ['mailgun_message_id', 'member_email'], knex);
        });
    },
    async function down(knex) {
        await runIfTableExists(knex, async () => {
            await dropIndex(table, ['mailgun_message_id', 'member_email'], knex);
            await dropColumns(knex);
        });
    }
);
