const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('newsletters', 'uuid', {
    type: 'string',
    maxlength: 36,
    nullable: true,
    unique: true
});
