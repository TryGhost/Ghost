const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('members', 'geolocation', {
    type: 'string',
    maxlength: 2000,
    nullable: true
});
