const logging = require('@tryghost/logging');
const {commands} = require('../../../schema');
const {createNonTransactionalMigration} = require('../../utils');

const oldAutomatedEmailsSpec = {
    id: {type: 'string', maxlength: 24, nullable: false, primary: true},
    status: {type: 'string', maxlength: 50, nullable: false, defaultTo: 'inactive', validations: {isIn: [['active', 'inactive']]}},
    name: {type: 'string', maxlength: 191, nullable: false, unique: true},
    slug: {type: 'string', maxlength: 191, nullable: false, unique: true},
    subject: {type: 'string', maxlength: 300, nullable: false},
    lexical: {type: 'text', maxlength: 1000000000, fieldtype: 'long', nullable: true},
    sender_name: {type: 'string', maxlength: 191, nullable: true},
    sender_email: {type: 'string', maxlength: 191, nullable: true, validations: {isEmail: true}},
    sender_reply_to: {type: 'string', maxlength: 191, nullable: true, validations: {isEmail: true}},
    email_design_setting_id: {type: 'string', maxlength: 24, nullable: false, references: 'email_design_settings.id'},
    created_at: {type: 'dateTime', nullable: false},
    updated_at: {type: 'dateTime', nullable: true},
    '@@INDEXES@@': [
        ['slug'],
        ['status']
    ]
};

module.exports = createNonTransactionalMigration(
    async function up(knex) {
        const exists = await knex.schema.hasTable('automated_emails');
        if (!exists) {
            logging.warn('Skipping dropping table automated_emails - does not exist');
            return;
        }

        logging.info('Dropping table: automated_emails');
        await commands.deleteTable('automated_emails', knex);
    },

    async function down(knex) {
        const exists = await knex.schema.hasTable('automated_emails');
        if (exists) {
            logging.warn('Skipping recreating table automated_emails - already exists');
            return;
        }

        logging.info('Recreating table: automated_emails');
        await commands.createTable('automated_emails', knex, oldAutomatedEmailsSpec);
    }
);
