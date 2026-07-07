const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('automated_email_recipients', 'track_opens', {
    type: 'boolean',
    nullable: false,
    defaultTo: false
});
