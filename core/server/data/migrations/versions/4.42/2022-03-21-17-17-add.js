const {addTable} = require('../../utils');

module.exports = addTable('newsletters', {
    id: {type: 'string', maxlength: 24, nullable: false, primary: true},
    name: {type: 'string', maxlength: 191, nullable: false},
    description: {type: 'string', maxlength: 2000, nullable: true},
    sender_name: {type: 'string', maxlength: 191, nullable: false},
    sender_email: {type: 'string', maxlength: 191, nullable: false, validations: {isEmail: true}},
    sender_reply_to: {type: 'string', maxlength: 191, nullable: false, validations: {isEmail: true}},
    default: {type: 'bool', nullable: false, defaultTo: false},
    status: {type: 'string', maxlength: 50, nullable: false, defaultTo: 'active'},
    recipient_filter: {
        type: 'text',
        maxlength: 1000000000,
        nullable: false,
        defaultTo: ''
    },
    subscribe_on_signup: {type: 'bool', nullable: false, defaultTo: false},
    sort_order: {type: 'integer', nullable: false, unsigned: true, defaultTo: 0}
});
