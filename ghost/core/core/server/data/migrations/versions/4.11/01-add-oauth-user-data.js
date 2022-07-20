const {addTable} = require('../../utils');

module.exports = addTable('oauth', {
    id: {type: 'string', maxlength: 24, nullable: false, primary: true},
    provider: {type: 'string', maxlength: 50, nullable: false},
    provider_id: {type: 'string', maxlength: 191, nullable: false},
    access_token: {type: 'text', maxlength: 65535, nullable: true},
    refresh_token: {type: 'text', maxlength: 2000, nullable: true},
    created_at: {type: 'dateTime', nullable: false},
    updated_at: {type: 'dateTime', nullable: true},
    user_id: {type: 'string', maxlength: 24, nullable: false, references: 'users.id'}
});
