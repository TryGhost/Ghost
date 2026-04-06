const logging = require('@tryghost/logging');
const {commands} = require('../../../schema');
const {createNonTransactionalMigration} = require('../../utils');

// The default names are too long.
const WELCOME_EMAIL_AUTOMATED_EMAILS_AUTOMATION_FK = 'weae_automation_id_foreign';
const WELCOME_EMAIL_AUTOMATED_EMAILS_NEXT_EMAIL_FK = 'weae_next_email_id_foreign';

const welcomeEmailAutomationsSpec = {
    id: {type: 'string', maxlength: 24, nullable: false, primary: true},
    status: {type: 'string', maxlength: 50, nullable: false, defaultTo: 'inactive', validations: {isIn: [['active', 'inactive']]}},
    name: {type: 'string', maxlength: 191, nullable: false, unique: true},
    slug: {type: 'string', maxlength: 191, nullable: false, unique: true},
    created_at: {type: 'dateTime', nullable: false},
    updated_at: {type: 'dateTime', nullable: true}
};

const welcomeEmailAutomatedEmailsSpec = {
    id: {type: 'string', maxlength: 24, nullable: false, primary: true},
    welcome_email_automation_id: {type: 'string', maxlength: 24, nullable: false, references: 'welcome_email_automations.id', constraintName: WELCOME_EMAIL_AUTOMATED_EMAILS_AUTOMATION_FK, cascadeDelete: true},
    next_welcome_email_automated_email_id: {type: 'string', maxlength: 24, nullable: true, references: 'welcome_email_automated_emails.id', constraintName: WELCOME_EMAIL_AUTOMATED_EMAILS_NEXT_EMAIL_FK, cascadeDelete: false},
    delay_days: {type: 'integer', nullable: false},
    subject: {type: 'string', maxlength: 300, nullable: false},
    lexical: {type: 'text', maxlength: 1000000000, fieldtype: 'long', nullable: true},
    sender_name: {type: 'string', maxlength: 191, nullable: true},
    sender_email: {type: 'string', maxlength: 191, nullable: true, validations: {isEmail: true}},
    sender_reply_to: {type: 'string', maxlength: 191, nullable: true, validations: {isEmail: true}},
    email_design_setting_id: {type: 'string', maxlength: 24, nullable: false, references: 'email_design_settings.id'},
    created_at: {type: 'dateTime', nullable: false},
    updated_at: {type: 'dateTime', nullable: true}
};

module.exports = createNonTransactionalMigration(
    async function up(knex) {
        const automationsExists = await knex.schema.hasTable('welcome_email_automations');
        if (automationsExists) {
            logging.warn('Skipping creating table welcome_email_automations - already exists');
        } else {
            logging.info('Creating table: welcome_email_automations');
            await commands.createTable('welcome_email_automations', knex, welcomeEmailAutomationsSpec);
        }

        const automatedEmailsExists = await knex.schema.hasTable('welcome_email_automated_emails');
        if (automatedEmailsExists) {
            logging.warn('Skipping creating table welcome_email_automated_emails - already exists');
        } else {
            logging.info('Creating table: welcome_email_automated_emails');
            await commands.createTable('welcome_email_automated_emails', knex, welcomeEmailAutomatedEmailsSpec);
        }
    },

    async function down(knex) {
        logging.info('Dropping table: welcome_email_automated_emails');
        await commands.deleteTable('welcome_email_automated_emails', knex);

        logging.info('Dropping table: welcome_email_automations');
        await commands.deleteTable('welcome_email_automations', knex);
    }
);
