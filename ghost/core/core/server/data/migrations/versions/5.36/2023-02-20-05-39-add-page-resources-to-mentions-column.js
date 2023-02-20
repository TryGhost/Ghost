const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('mentions', 'page_resources', {
    type: 'string',
    maxlength: 191,
    nullable: true
});
