const {addTable} = require('../../utils');

module.exports = addTable('outbox', {
    id: {type: 'string', maxlength: 24, nullable: false, primary: true},
    event_type: {type: 'string', maxlength: 50, nullable: false},
    payload: {type: 'text', maxlength: 65535, nullable: false},
    created_at: {type: 'dateTime', nullable: false},
    retry_count: {type: 'integer', nullable: false, defaultTo: 0},
    last_retry_at: {type: 'dateTime', nullable: true}
});