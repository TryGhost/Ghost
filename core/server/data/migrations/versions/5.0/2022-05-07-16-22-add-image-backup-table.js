const utils = require('../../utils');

module.exports = utils.addTable('image_backups', {
    id: {type: 'string', maxlength: 24, nullable: false, primary: true},
    created_at: {type: 'dateTime', nullable: false},
    backup_completed: { type: 'bool', nullable: false, defaultTo: false},
});
