const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('members', 'rss_token', {
    type: 'string',
    maxlength: 191,
    nullable: true,
    unique: true
});