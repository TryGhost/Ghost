const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('members', 'status', {
    type: 'string',
    maxlength: 50,
    nullable: false,
    defaultTo: 'free',
    validations: {
        isIn: [['free', 'paid']]
    }
});
