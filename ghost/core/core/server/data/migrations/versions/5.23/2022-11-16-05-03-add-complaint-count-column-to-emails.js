const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('emails', 'complaint_count', {
    type: 'integer',
    unsigned: true,
    nullable: false,
    defaultTo: 0
});
