const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('users', 'recommendation_notifications', {
    type: 'boolean',
    nullable: false,
    defaultTo: true
});
