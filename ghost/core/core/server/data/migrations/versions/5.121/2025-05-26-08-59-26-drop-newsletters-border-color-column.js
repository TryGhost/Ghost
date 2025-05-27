const {createDropColumnMigration} = require('../../utils');

module.exports = createDropColumnMigration('newsletters', 'border_color', {
    type: 'string',
    maxlength: 50,
    nullable: true
});