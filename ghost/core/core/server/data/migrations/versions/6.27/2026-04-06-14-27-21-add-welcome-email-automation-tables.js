const {addTable, combineNonTransactionalMigrations} = require('../../utils');

// The default names are too long.
const WELCOME_EMAIL_AUTOMATED_EMAILS_AUTOMATION_FK = 'weae_automation_id_foreign';
const WELCOME_EMAIL_AUTOMATED_EMAILS_NEXT_EMAIL_FK = 'weae_next_email_id_foreign';

module.exports = combineNonTransactionalMigrations(
    addTable('welcome_email_automations', {
        id: {type: 'string', maxlength: 24, nullable: false, primary: true},
        status: {type: 'string', maxlength: 50, nullable: false, defaultTo: 'inactive', validations: {isIn: [['active', 'inactive']]}},
        name: {type: 'string', maxlength: 191, nullable: false, unique: true},
        slug: {type: 'string', maxlength: 191, nullable: false, unique: true},
        created_at: {type: 'dateTime', nullable: false},
        updated_at: {type: 'dateTime', nullable: true}
    }),
    addTable('welcome_email_automated_emails', {
        id: {type: 'string', maxlength: 24, nullable: false, primary: true},
        welcome_email_automation_id: {type: 'string', maxlength: 24, nullable: false, references: 'welcome_email_automations.id', constraintName: WELCOME_EMAIL_AUTOMATED_EMAILS_AUTOMATION_FK, cascadeDelete: true},
        next_welcome_email_automated_email_id: {type: 'string', maxlength: 24, nullable: true, references: 'welcome_email_automated_emails.id', constraintName: WELCOME_EMAIL_AUTOMATED_EMAILS_NEXT_EMAIL_FK, cascadeDelete: false},
        delay_days: {type: 'integer', nullable: false, unsigned: true},
        subject: {type: 'string', maxlength: 300, nullable: false},
        lexical: {type: 'text', maxlength: 1000000000, fieldtype: 'long', nullable: true},
        sender_name: {type: 'string', maxlength: 191, nullable: true},
        sender_email: {type: 'string', maxlength: 191, nullable: true, validations: {isEmail: true}},
        sender_reply_to: {type: 'string', maxlength: 191, nullable: true, validations: {isEmail: true}},
        email_design_setting_id: {type: 'string', maxlength: 24, nullable: false, references: 'email_design_settings.id'},
        created_at: {type: 'dateTime', nullable: false},
        updated_at: {type: 'dateTime', nullable: true}
    })
);
