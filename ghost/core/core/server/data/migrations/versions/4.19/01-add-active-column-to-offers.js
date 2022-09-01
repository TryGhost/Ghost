const utils = require('../../utils');

module.exports = utils.createAddColumnMigration('offers', 'active', {
    type: 'boolean',
    nullable: false,
    defaultTo: true
});
