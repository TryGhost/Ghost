const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('mentions', 'revalidation_failure_count', {
    type: 'integer',
    nullable: false,
    unsigned: true,
    defaultTo: 0
});
