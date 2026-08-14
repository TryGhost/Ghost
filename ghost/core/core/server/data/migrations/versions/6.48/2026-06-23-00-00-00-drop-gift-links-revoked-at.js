const {createDropColumnMigration} = require('../../utils');

module.exports = createDropColumnMigration('gift_links', 'revoked_at', {
    type: 'dateTime',
    nullable: true
});
