const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('member_gifts', 'delivery_method', {
    type: 'string',
    maxlength: 50,
    nullable: false,
    defaultTo: 'link',
    validations: {
        isIn: [['link', 'email']]
    }
}, {algorithm: 'auto'});
