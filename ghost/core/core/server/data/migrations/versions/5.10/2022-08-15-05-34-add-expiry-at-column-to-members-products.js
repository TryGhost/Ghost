const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('members_products', 'expiry_at', {
    type: 'dateTime',
    nullable: true
});
