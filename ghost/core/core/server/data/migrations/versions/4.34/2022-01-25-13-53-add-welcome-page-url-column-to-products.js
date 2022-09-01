const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('products', 'welcome_page_url', {
    type: 'string',
    maxlength: 2000,
    nullable: true
});
