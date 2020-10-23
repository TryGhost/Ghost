const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('api_keys', 'user_id', {
    type: 'string',
    maxlength: 24,
    nullable: true
});
