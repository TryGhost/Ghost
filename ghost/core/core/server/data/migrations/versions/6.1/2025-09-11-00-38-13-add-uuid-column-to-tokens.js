const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('tokens', 'uuid', {
    type: 'string',
    maxlength: 36,
    nullable: true,
    unique: true
});