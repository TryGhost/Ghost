const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('emails', 'track_opens', {
    type: 'bool',
    nullable: false,
    defaultTo: false
});
