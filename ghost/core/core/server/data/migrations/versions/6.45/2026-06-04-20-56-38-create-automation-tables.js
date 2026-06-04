const logging = require('@tryghost/logging');
const {createNonTransactionalMigration} = require('../../utils');

async function createAutomationActionsTable(connection) {
    await connection.schema.createTable('automation_actions', function (table) {
        table.string('id', 24).notNullable().primary();
        table.dateTime('created_at').notNullable();
        table.dateTime('updated_at').notNullable();
        table.dateTime('deleted_at').nullable();
        table.string('automation_id', 24).notNullable();
        table.string('type', 50).notNullable();

        table.foreign('automation_id').references('automations.id').onDelete('RESTRICT');
    });
}

async function createAutomationActionRevisionsTable(connection) {
    await connection.schema.createTable('automation_action_revisions', function (table) {
        table.string('id', 24).notNullable().primary();
        table.dateTime('created_at').notNullable();
        table.string('action_id', 24).notNullable();
        table.integer('wait_hours').unsigned().nullable();
        table.string('email_subject', 300).nullable();
        table.text('email_lexical', 'long').nullable();
        table.string('email_sender_name', 191).nullable();
        table.string('email_sender_email', 191).nullable();
        table.string('email_sender_reply_to', 191).nullable();
        table.string('email_design_setting_id', 24).nullable();

        table.foreign('action_id').references('automation_actions.id').onDelete('RESTRICT');
        table.foreign('email_design_setting_id').references('email_design_settings.id').onDelete('SET NULL');
        table.unique(['created_at', 'action_id']);
    });
}

async function createAutomationActionEdgesTable(connection) {
    await connection.schema.createTable('automation_action_edges', function (table) {
        table.string('source_action_id', 24).notNullable();
        table.string('target_action_id', 24).notNullable();

        table.foreign('source_action_id').references('automation_actions.id').onDelete('RESTRICT');
        table.foreign('target_action_id').references('automation_actions.id').onDelete('RESTRICT');
        table.primary(['source_action_id', 'target_action_id']);
    });
}

async function createAutomationRunsTable(connection) {
    await connection.schema.createTable('automation_runs', function (table) {
        table.string('id', 24).notNullable().primary();
        table.dateTime('created_at').notNullable();
        table.dateTime('updated_at').notNullable();
        table.string('automation_id', 24).notNullable();
        table.string('member_id', 24).nullable().index();
        table.string('member_email', 191).notNullable();

        table.foreign('automation_id').references('automations.id').onDelete('RESTRICT');
        table.foreign('member_id').references('members.id').onDelete('SET NULL');
    });
}

async function createAutomationRunStepsTable(connection) {
    await connection.schema.createTable('automation_run_steps', function (table) {
        table.string('id', 24).notNullable().primary();
        table.dateTime('created_at').notNullable();
        table.dateTime('updated_at').notNullable();
        table.string('automation_run_id', 24).notNullable();
        table.string('automation_action_revision_id', 24).notNullable();
        table.dateTime('ready_at').notNullable();
        table.integer('step_attempts').unsigned().notNullable().defaultTo(0);
        table.dateTime('started_at').nullable();
        table.dateTime('finished_at').nullable();
        table.string('status', 50).notNullable().defaultTo('pending');
        table.string('locked_by', 191).nullable();
        table.dateTime('locked_at').nullable();

        table.foreign('automation_run_id').references('automation_runs.id').onDelete('RESTRICT');
        table.foreign('automation_action_revision_id').references('automation_action_revisions.id').onDelete('RESTRICT');
    });
}

const CREATE_TABLES = {
    automation_actions: createAutomationActionsTable,
    automation_action_revisions: createAutomationActionRevisionsTable,
    automation_action_edges: createAutomationActionEdgesTable,
    automation_runs: createAutomationRunsTable,
    automation_run_steps: createAutomationRunStepsTable
};

module.exports = createNonTransactionalMigration(
    async function up(connection) {
        // eslint-disable-next-line no-restricted-syntax
        for (const [tableName, createTable] of Object.entries(CREATE_TABLES)) {
            const exists = await connection.schema.hasTable(tableName);

            if (exists) {
                logging.warn(`Skipping adding table: ${tableName} - table already exists`);
                continue;
            }

            logging.info(`Adding table: ${tableName}`);
            await createTable(connection);
        }
    },

    async function down(connection) {
        // eslint-disable-next-line no-restricted-syntax
        for (const [tableName] of Object.entries(CREATE_TABLES).reverse()) {
            const exists = await connection.schema.hasTable(tableName);

            if (!exists) {
                logging.warn(`Skipping dropping table: ${tableName} - table does not exist`);
                continue;
            }

            logging.info(`Dropping table: ${tableName}`);
            await connection.schema.dropTable(tableName);
        }
    }
);
