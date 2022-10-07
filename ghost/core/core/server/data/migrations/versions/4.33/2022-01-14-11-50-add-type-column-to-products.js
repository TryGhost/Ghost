const utils = require('../../utils');

module.exports = utils.createAddColumnMigration(
    'products',
    'type',
    {
        type: 'string',
        maxlength: 50,
        nullable: false,
        defaultTo: 'paid'
    }
);
