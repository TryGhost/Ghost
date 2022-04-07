const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('newsletters', 'slug', {
    type: 'string',
    maxlength: 191,
    nullable: false,
    unique: true
});
