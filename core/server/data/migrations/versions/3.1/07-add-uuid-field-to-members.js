const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('members', 'uuid', {
    type: 'string',
    maxlength: 36,
    nullable: true,
    unique: true
});
