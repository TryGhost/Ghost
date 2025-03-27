const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('emails', 'track_clicks', {
    type: 'boolean',
    nullable: false,
    defaultTo: false
});
