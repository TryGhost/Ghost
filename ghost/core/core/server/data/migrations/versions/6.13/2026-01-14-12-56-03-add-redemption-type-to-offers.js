const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('offers', 'redemption_type', {
    type: 'string',
    maxlength: 50,
    nullable: false,
    defaultTo: 'signup'
});
