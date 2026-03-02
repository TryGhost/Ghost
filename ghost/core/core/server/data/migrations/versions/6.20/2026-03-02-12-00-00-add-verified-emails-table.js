const {addTable} = require('../../utils');

module.exports = addTable('verified_emails', {
    id: {type: 'string', maxlength: 24, nullable: false, primary: true},
    email: {type: 'string', maxlength: 191, nullable: false, unique: true, validations: {isEmail: true}},
    status: {type: 'string', maxlength: 50, nullable: false, defaultTo: 'pending', validations: {isIn: [['pending', 'verified']]}},
    created_at: {type: 'dateTime', nullable: false},
    updated_at: {type: 'dateTime', nullable: true}
});
