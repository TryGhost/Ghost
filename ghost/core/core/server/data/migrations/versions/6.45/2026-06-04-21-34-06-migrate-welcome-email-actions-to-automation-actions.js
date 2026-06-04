const logging = require('@tryghost/logging');
const ObjectId = require('bson-objectid').default;

const {createTransactionalMigration} = require('../../utils');

const REQUIRED_TABLES = [
    'welcome_email_automated_emails',
    'automation_actions',
    'automation_action_revisions',
    'automation_action_edges'
];

async function hasRequiredTables(knex) {
    // eslint-disable-next-line no-restricted-syntax
    for (const table of REQUIRED_TABLES) {
        const exists = await knex.schema.hasTable(table);

        if (!exists) {
            logging.warn(`Skipping welcome email action migration - ${table} table does not exist`);
            return false;
        }
    }

    return true;
}

function id() {
    return ObjectId().toHexString();
}

function updatedAtFor(row) {
    return row.updated_at || row.created_at;
}

module.exports = createTransactionalMigration(
    async function up(knex) {
        if (!await hasRequiredTables(knex)) {
            return;
        }

        const rows = await knex('welcome_email_automated_emails').select('*');
        logging.info(`Migrating ${rows.length} welcome email rows to automation action tables`);

        // The legacy welcome email system only created one email action for each
        // automation. Copy it as a generic send_email action and keep the old
        // row untouched so older references can still be inspected if needed.
        // eslint-disable-next-line no-restricted-syntax
        for (const row of rows) {
            const existingAction = await knex('automation_actions')
                .where({
                    automation_id: row.welcome_email_automation_id,
                    type: 'send_email'
                })
                .whereNull('deleted_at')
                .first();

            if (existingAction) {
                logging.warn(`Skipping welcome email row ${row.id} - send_email action already exists for automation ${row.welcome_email_automation_id}`);
                continue;
            }

            const actionId = id();

            await knex('automation_actions').insert({
                id: actionId,
                created_at: row.created_at,
                updated_at: updatedAtFor(row),
                deleted_at: null,
                automation_id: row.welcome_email_automation_id,
                type: 'send_email'
            });

            await knex('automation_action_revisions').insert({
                id: id(),
                created_at: updatedAtFor(row),
                action_id: actionId,
                wait_hours: null,
                email_subject: row.subject,
                email_lexical: row.lexical,
                email_sender_name: row.sender_name,
                email_sender_email: row.sender_email,
                email_sender_reply_to: row.sender_reply_to,
                email_design_setting_id: row.email_design_setting_id
            });

            logging.info(`Migrated welcome email row ${row.id} to automation action ${actionId}`);
        }
    },

    async function down(knex) {
        if (!await hasRequiredTables(knex)) {
            return;
        }

        const rows = await knex('welcome_email_automated_emails').select('*');
        logging.info(`Removing migrated automation actions for ${rows.length} welcome email rows`);

        // eslint-disable-next-line no-restricted-syntax
        for (const row of rows) {
            const actions = await knex('automation_actions')
                .where({
                    automation_id: row.welcome_email_automation_id,
                    type: 'send_email',
                    created_at: row.created_at
                })
                .whereNull('deleted_at')
                .select('id');

            const actionIds = actions.map(action => action.id);

            if (actionIds.length === 0) {
                logging.warn(`Skipping rollback for welcome email row ${row.id} - no migrated send_email action found`);
                continue;
            }

            await knex('automation_action_revisions').whereIn('action_id', actionIds).del();
            await knex('automation_action_edges')
                .whereIn('source_action_id', actionIds)
                .orWhereIn('target_action_id', actionIds)
                .del();
            await knex('automation_actions').whereIn('id', actionIds).del();

            logging.info(`Removed migrated automation actions for welcome email row ${row.id}`);
        }
    }
);
