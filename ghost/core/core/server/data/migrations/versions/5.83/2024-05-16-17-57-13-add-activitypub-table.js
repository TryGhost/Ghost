const {addTable} = require('../../utils');

module.exports = addTable('prototype_activitypub', {
    id: {type: 'string', maxlength: 24, nullable: false, primary: true},
    url: {type: 'string', maxlength: 255, nullable: false, unique: true},
    type: {type: 'string', maxlength: 24, nullable: false},
    created_at: {type: 'dateTime', nullable: false},
    updated_at: {type: 'dateTime', nullable: false},
    data: {type: 'json', nullable: false},
    internal: {type: 'boolean', nullable: false, defaultTo: false}
});

