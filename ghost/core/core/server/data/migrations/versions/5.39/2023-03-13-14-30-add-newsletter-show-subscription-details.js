const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('newsletters', 'show_subscription_details', {
    type: 'boolean',
    nullable: false,
    defaultTo: false
});
