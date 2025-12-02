const {addTable} = require('../../utils');

module.exports = addTable('automated_emails', {
    id: {type: 'string', maxlength: 24, nullable: false, primary: true},
    status: {type: 'string', maxlength: 50, nullable: false, defaultTo: 'inactive'},
    slug: {type: 'string', maxlength: 191, nullable: false, unique: true},
    name: {type: 'string', maxlength: 191, nullable: false, unique: true},
    subject: {type: 'string', maxlength: 300, nullable: false},
    lexical: {type: 'text', maxlength: 1000000000, fieldtype: 'long', nullable: true},
    sender_name: {type: 'string', maxlength: 191, nullable: true},
    sender_email: {type: 'string', maxlength: 191, nullable: true},
    sender_reply_to: {type: 'string', maxlength: 191, nullable: true},
    created_at: {type: 'dateTime', nullable: false},
    updated_at: {type: 'dateTime', nullable: true},
    '@@INDEXES@@': [
        ['slug'],
        ['status']
    ]

});
