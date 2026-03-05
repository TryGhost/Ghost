const {addTable} = require('../../utils');

module.exports = addTable('campaign_enrollments', {
    id: {type: 'string', maxlength: 24, nullable: false, primary: true},
    member_id: {type: 'string', maxlength: 24, nullable: false, references: 'members.id', cascadeDelete: true},
    campaign_type: {type: 'string', maxlength: 50, nullable: false, validations: {isIn: [['free_signup', 'paid_signup', 'paid_conversion']]}},
    status: {type: 'string', maxlength: 50, nullable: false, defaultTo: 'active', validations: {isIn: [['active', 'exited', 'completed']]}},
    current_step: {type: 'integer', nullable: false, unsigned: true, defaultTo: 0},
    exit_reason: {type: 'string', maxlength: 50, nullable: true, validations: {isIn: [['converted', 'unsubscribed', 'admin', 'campaign_disabled']]}},
    enrolled_campaign_version: {type: 'integer', nullable: false, unsigned: true, defaultTo: 1},
    next_email_at: {type: 'dateTime', nullable: true},
    enrolled_at: {type: 'dateTime', nullable: false},
    exited_at: {type: 'dateTime', nullable: true},
    created_at: {type: 'dateTime', nullable: false},
    updated_at: {type: 'dateTime', nullable: true},
    '@@UNIQUE_CONSTRAINTS@@': [
        ['member_id', 'campaign_type']
    ],
    '@@INDEXES@@': [
        ['status', 'next_email_at'],
        ['campaign_type', 'status']
    ]
});
