const {addTable} = require('../../utils');

// The default names are too long for MySQL.
const WELCOME_EMAIL_AUTOMATION_RUNS_AUTOMATION_FK = 'wear_automation_id_foreign';
const WELCOME_EMAIL_AUTOMATION_RUNS_MEMBER_FK = 'wear_member_id_foreign';
const WELCOME_EMAIL_AUTOMATION_RUNS_NEXT_EMAIL_FK = 'wear_next_email_id_foreign';

const welcomeEmailAutomationRunsSpec = {
    id: {type: 'string', maxlength: 24, nullable: false, primary: true},
    welcome_email_automation_id: {type: 'string', maxlength: 24, nullable: false, references: 'welcome_email_automations.id', constraintName: WELCOME_EMAIL_AUTOMATION_RUNS_AUTOMATION_FK, cascadeDelete: true},
    member_id: {type: 'string', maxlength: 24, nullable: false, references: 'members.id', constraintName: WELCOME_EMAIL_AUTOMATION_RUNS_MEMBER_FK, cascadeDelete: true},
    next_welcome_email_automated_email_id: {type: 'string', maxlength: 24, nullable: true, references: 'welcome_email_automated_emails.id', constraintName: WELCOME_EMAIL_AUTOMATION_RUNS_NEXT_EMAIL_FK, cascadeDelete: false},
    ready_at: {type: 'dateTime', nullable: true},
    step_started_at: {type: 'dateTime', nullable: true},
    step_attempts: {type: 'integer', unsigned: true, nullable: false, defaultTo: 0},
    exit_reason: {type: 'string', maxlength: 50, nullable: true, validations: {isIn: [['member not found', 'email send failed', 'member unsubscribed', 'member changed status', 'finished']]}},
    created_at: {type: 'dateTime', nullable: false},
    updated_at: {type: 'dateTime', nullable: true},
    '@@INDEXES@@': [
        ['ready_at']
    ]
};

module.exports = addTable('welcome_email_automation_runs', welcomeEmailAutomationRunsSpec);
