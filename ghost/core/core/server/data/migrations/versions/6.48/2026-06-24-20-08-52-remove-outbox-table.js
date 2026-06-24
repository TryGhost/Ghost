const logging = require('@tryghost/logging');
const {commands} = require('../../../schema');
const {createNonTransactionalMigration} = require('../../utils');

const oldOutboxSpec = {
    id: {type: 'string', maxlength: 24, nullable: false, primary: true},
    event_type: {type: 'string', maxlength: 50, nullable: false},
    status: {type: 'string', maxlength: 50, nullable: false, defaultTo: 'pending'},
    payload: {type: 'text', maxlength: 65535, nullable: false},
    created_at: {type: 'dateTime', nullable: false},
    updated_at: {type: 'dateTime', nullable: true},
    retry_count: {type: 'integer', nullable: false, unsigned: true, defaultTo: 0},
    last_retry_at: {type: 'dateTime', nullable: true},
    message: {type: 'string', maxlength: 2000, nullable: true},
    '@@INDEXES@@': [
        ['event_type', 'status', 'created_at']
    ]
};

module.exports = createNonTransactionalMigration(
    async function up(knex) {
        const exists = await knex.schema.hasTable('outbox');
        if (!exists) {
            logging.warn('Skipping dropping table outbox - does not exist');
            return;
        }

        logging.info('Dropping table: outbox');
        await commands.deleteTable('outbox', knex);
    },

    async function down(knex) {
        const exists = await knex.schema.hasTable('outbox');
        if (exists) {
            logging.warn('Skipping recreating table outbox - already exists');
            return;
        }

        logging.info('Recreating table: outbox');
        await commands.createTable('outbox', knex, oldOutboxSpec);
    }
);
