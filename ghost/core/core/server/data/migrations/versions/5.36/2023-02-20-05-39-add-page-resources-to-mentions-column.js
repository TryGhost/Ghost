const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('mentions', 'page_resources', {
    type: 'string',
    maxlength: 2000,
    nullable: false
});
