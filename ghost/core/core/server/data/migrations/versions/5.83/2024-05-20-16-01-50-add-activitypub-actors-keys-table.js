const {addTable} = require('../../utils');

module.exports = addTable('prototype_activitypub_actors_keys', {
    id: {type: 'string', maxlength: 24, nullable: false, primary: true},
    actor_id: {type: 'string', maxlength: 255, nullable: false, unique: true},
    private_key: {type: 'string', maxlength: 2000, nullable: false},
    public_key: {type: 'string', maxlength: 2000, nullable: false},
    created_at: {type: 'dateTime', nullable: false},
    updated_at: {type: 'dateTime', nullable: false}
});
