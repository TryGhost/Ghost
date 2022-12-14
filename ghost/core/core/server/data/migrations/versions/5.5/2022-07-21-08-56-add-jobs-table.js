const {addTable} = require('../../utils');

module.exports = addTable('jobs', {
    id: {type: 'string', maxlength: 24, nullable: false, primary: true},
    name: {type: 'string', maxlength: 191, nullable: false, unique: true},
    status: {type: 'string', maxlength: 50, nullable: false, defaultTo: 'queued', validations: {isIn: [['started', 'finished', 'failed', 'queued']]}},
    started_at: {type: 'dateTime', nullable: true},
    finished_at: {type: 'dateTime', nullable: true},
    created_at: {type: 'dateTime', nullable: false},
    updated_at: {type: 'dateTime', nullable: true}
});
