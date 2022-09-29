const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('emails', 'track_clicks', {
    type: 'bool', 
    nullable: false, 
    defaultTo: false
});
