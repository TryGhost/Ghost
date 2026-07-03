const logging = require('@tryghost/logging');
const {createNonTransactionalMigration} = require('../../utils');
const {addColumn, createColumnMigration, dropColumn} = require('../../../schema/commands');

const table = 'members';

const columns = {
    automation_email_count: {type: 'integer', nullable: false, unsigned: true, defaultTo: 0},
    automation_email_opened_count: {type: 'integer', nullable: false, unsigned: true, defaultTo: 0},
    automation_email_open_rate: {type: 'integer', nullable: true, unsigned: true}
};

async function runIfTableExists(knex, operation) {
    const tableExists = await knex.schema.hasTable(table);

    if (!tableExists) {
        logging.warn(`Skipping member automation email counters migration - ${table} table does not exist`);
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
        });
    },
    async function down(knex) {
        await runIfTableExists(knex, async () => {
            await dropColumns(knex);
        });
    }
);
