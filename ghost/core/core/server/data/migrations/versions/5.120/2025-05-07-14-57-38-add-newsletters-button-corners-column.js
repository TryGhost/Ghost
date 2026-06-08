const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('newsletters', 'button_corners', {
    type: 'string',
    maxlength: 50,
    nullable: false,
    defaultTo: 'rounded'
});
