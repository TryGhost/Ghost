const {addTable} = require('../../utils');

module.exports = addTable('members_subscribe_events', {
    id: {type: 'string', maxlength: 24, nullable: false, primary: true},
    member_id: {type: 'string', maxlength: 24, nullable: false, unique: false, references: 'members.id', cascadeDelete: true},
    subscribed: {type: 'bool', nullable: false, defaultTo: true},
    created_at: {type: 'dateTime', nullable: false},
    source: {type: 'string', maxlength: 50, nullable: true}
});
