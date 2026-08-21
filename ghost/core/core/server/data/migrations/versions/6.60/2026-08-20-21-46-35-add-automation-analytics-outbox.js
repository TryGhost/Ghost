const {addTable} = require('../../utils');

module.exports = addTable('automation_analytics_outbox', {
    id: {type: 'string', maxlength: 24, nullable: false, primary: true},
    payload: {type: 'text', maxlength: 1000000000, fieldtype: 'long', nullable: false},
    created_at: {type: 'dateTime', nullable: false},
    available_at: {type: 'dateTime', nullable: false},
    locked_at: {type: 'dateTime', nullable: true},
    locked_by: {type: 'string', maxlength: 191, nullable: true},
    '@@INDEXES@@': [
        ['available_at', 'locked_at', 'created_at']
    ]
});
