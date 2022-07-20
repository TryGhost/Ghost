const {addTable} = require('../../utils');

module.exports = addTable('members_product_events', {
    id: {
        type: 'string',
        maxlength: 24,
        nullable: false,
        primary: true
    },
    member_id: {
        type: 'string',
        maxlength: 24,
        nullable: false,
        references: 'members.id',
        cascadeDelete: true
    },
    product_id: {
        type: 'string',
        maxlength: 24,
        nullable: false,
        references: 'products.id',
        cascadeDelete: false
    },
    action: {
        type: 'string',
        maxlength: 50,
        nullable: true
    },
    created_at: {
        type: 'dateTime',
        nullable: false
    }
});
