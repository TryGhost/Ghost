const logging = require('@tryghost/logging');
const {createNonTransactionalMigration} = require('../../utils');
const commands = require('../../../schema/commands');

const AUTOMATED_EMAIL_RECIPIENT_COLUMNS = {
    automation_action_id: {type: 'string', maxlength: 24, nullable: true, references: 'automation_actions.id', setNullDelete: true},
    automation_run_step_id: {type: 'string', maxlength: 24, nullable: true, references: 'automation_run_steps.id', setNullDelete: true},
    sent_at: {type: 'dateTime', nullable: true},
    delivered_at: {type: 'dateTime', nullable: true},
    opened_at: {type: 'dateTime', nullable: true},
    failed_at: {type: 'dateTime', nullable: true},
    provider_id: {type: 'string', maxlength: 255, nullable: true}
};

const REDIRECT_COLUMNS = {
    automation_action_id: {type: 'string', maxlength: 24, nullable: true},
    automation_to_hash: {type: 'string', maxlength: 64, nullable: true}
};

const INDEXES = [
    ['automated_email_recipients', ['automation_action_id', 'sent_at']],
    ['automated_email_recipients', ['automation_action_id', 'opened_at']],
    ['automated_email_recipients', ['automation_action_id', 'failed_at']],
    ['automated_email_recipients', ['provider_id']],
    ['redirects', ['automation_action_id']]
];

const UNIQUE_CONSTRAINTS = [
    ['redirects', ['automation_action_id', 'automation_to_hash']]
];

async function addColumns(knex, table, columns) {
    await Object.entries(columns).reduce(async (previous, [column, definition]) => {
        await previous;

        const hasColumn = await knex.schema.hasColumn(table, column);
        if (hasColumn) {
            logging.warn(`Adding automation email analytics: ${table}.${column} already exists, skipping`);
            return;
        }

        logging.info(`Adding automation email analytics: adding ${table}.${column}`);
        await commands.addColumn(table, column, knex, definition);
    }, Promise.resolve());
}

async function dropColumns(knex, table, columns) {
    await Object.entries(columns).reverse().reduce(async (previous, [column, definition]) => {
        await previous;

        const hasColumn = await knex.schema.hasColumn(table, column);
        if (!hasColumn) {
            logging.warn(`Removing automation email analytics: ${table}.${column} missing, skipping`);
            return;
        }

        logging.info(`Removing automation email analytics: dropping ${table}.${column}`);
        await commands.dropColumn(table, column, knex, definition);
    }, Promise.resolve());
}

module.exports = createNonTransactionalMigration(
    async function up(knex) {
        await addColumns(knex, 'automated_email_recipients', AUTOMATED_EMAIL_RECIPIENT_COLUMNS);
        await addColumns(knex, 'redirects', REDIRECT_COLUMNS);

        await INDEXES.reduce(async (previous, [table, columns]) => {
            await previous;
            await commands.addIndex(table, columns, knex);
        }, Promise.resolve());

        await UNIQUE_CONSTRAINTS.reduce(async (previous, [table, columns]) => {
            await previous;
            await commands.addUnique(table, columns, knex);
        }, Promise.resolve());
    },
    async function down(knex) {
        await [...UNIQUE_CONSTRAINTS].reverse().reduce(async (previous, [table, columns]) => {
            await previous;
            await commands.dropUnique(table, columns, knex);
        }, Promise.resolve());

        await [...INDEXES].reverse().reduce(async (previous, [table, columns]) => {
            await previous;
            await commands.dropIndex(table, columns, knex);
        }, Promise.resolve());

        await dropColumns(knex, 'redirects', REDIRECT_COLUMNS);
        await dropColumns(knex, 'automated_email_recipients', AUTOMATED_EMAIL_RECIPIENT_COLUMNS);
    }
);
