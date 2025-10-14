const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('tokens', 'otc_used_count', {
    type: 'integer',
    nullable: false,
    unsigned: true,
    defaultTo: 0
});
