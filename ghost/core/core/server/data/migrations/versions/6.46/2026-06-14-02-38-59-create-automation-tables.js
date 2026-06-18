const {addTable, combineNonTransactionalMigrations} = require('../../utils');

module.exports = combineNonTransactionalMigrations(
    addTable('automation_actions', {
        id: {type: 'string', maxlength: 24, nullable: false, primary: true},
        created_at: {type: 'dateTime', nullable: false},
        updated_at: {type: 'dateTime', nullable: false},
        deleted_at: {type: 'dateTime', nullable: true},
        automation_id: {type: 'string', maxlength: 24, nullable: false, references: 'automations.id', restrictDelete: true},
        type: {type: 'string', maxlength: 50, nullable: false, validations: {isIn: [['wait', 'send_email']]}}
    }),
    addTable('automation_action_revisions', {
        id: {type: 'string', maxlength: 24, nullable: false, primary: true},
        created_at: {type: 'dateTime', nullable: false},
        action_id: {type: 'string', maxlength: 24, nullable: false, references: 'automation_actions.id', restrictDelete: true},
        wait_hours: {type: 'integer', nullable: true, unsigned: true},
        email_subject: {type: 'string', maxlength: 300, nullable: true},
        email_lexical: {type: 'text', maxlength: 1000000000, fieldtype: 'long', nullable: true},
        email_design_setting_id: {type: 'string', maxlength: 24, nullable: true, references: 'email_design_settings.id', setNullDelete: true},
        '@@UNIQUE_CONSTRAINTS@@': [
            ['created_at', 'action_id']
        ]
    }),
    addTable('automation_action_edges', {
        source_action_id: {type: 'string', maxlength: 24, nullable: false, references: 'automation_actions.id', restrictDelete: true},
        target_action_id: {type: 'string', maxlength: 24, nullable: false, references: 'automation_actions.id', restrictDelete: true},
        '@@PRIMARY_KEY@@': ['source_action_id', 'target_action_id']
    }),
    addTable('automation_runs', {
        id: {type: 'string', maxlength: 24, nullable: false, primary: true},
        created_at: {type: 'dateTime', nullable: false},
        updated_at: {type: 'dateTime', nullable: false},
        automation_id: {type: 'string', maxlength: 24, nullable: false, references: 'automations.id', restrictDelete: true},
        member_id: {type: 'string', maxlength: 24, nullable: true, references: 'members.id', setNullDelete: true, index: true},
        member_email: {type: 'string', maxlength: 191, nullable: false, validations: {isEmail: true}}
    }),
    addTable('automation_run_steps', {
        id: {type: 'string', maxlength: 24, nullable: false, primary: true},
        created_at: {type: 'dateTime', nullable: false},
        updated_at: {type: 'dateTime', nullable: false},
        automation_run_id: {type: 'string', maxlength: 24, nullable: false, references: 'automation_runs.id', restrictDelete: true},
        automation_action_revision_id: {type: 'string', maxlength: 24, nullable: false, references: 'automation_action_revisions.id', restrictDelete: true},
        ready_at: {type: 'dateTime', nullable: false},
        step_attempts: {type: 'integer', nullable: false, unsigned: true, defaultTo: 0},
        started_at: {type: 'dateTime', nullable: true},
        finished_at: {type: 'dateTime', nullable: true},
        status: {type: 'string', maxlength: 50, nullable: false, defaultTo: 'pending', validations: {isIn: [['pending', 'automation disabled', 'failed', 'finished', 'member changed status', 'member unsubscribed']]}},
        locked_by: {type: 'string', maxlength: 191, nullable: true},
        locked_at: {type: 'dateTime', nullable: true}
    })
);
