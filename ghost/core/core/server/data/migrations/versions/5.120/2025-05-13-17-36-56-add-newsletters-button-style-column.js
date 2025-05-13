const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('newsletters', 'button_style', {
    type: 'string',
    maxlength: 50,
    nullable: false,
    defaultTo: 'fill'
});
