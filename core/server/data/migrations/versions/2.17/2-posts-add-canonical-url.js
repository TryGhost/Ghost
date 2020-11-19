const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('posts', 'canonical_url', {
    type: 'text',
    maxlength: 2000,
    nullable: true
});
