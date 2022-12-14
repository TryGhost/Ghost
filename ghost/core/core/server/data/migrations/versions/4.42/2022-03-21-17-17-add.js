// ESLint Override Notice
// This file was named incorrectly and it didn't flag up in our eslint rules.
// The ESLint match-regex rule has now been updated to catch this, but this file has to be excluded.
/* eslint-disable ghost/filenames/match-regex */

const {addTable} = require('../../utils');

module.exports = addTable('newsletters', {
    id: {type: 'string', maxlength: 24, nullable: false, primary: true},
    name: {type: 'string', maxlength: 191, nullable: false},
    description: {type: 'string', maxlength: 2000, nullable: true},
    sender_name: {type: 'string', maxlength: 191, nullable: false},
    sender_email: {type: 'string', maxlength: 191, nullable: false, validations: {isEmail: true}},
    sender_reply_to: {type: 'string', maxlength: 191, nullable: false, validations: {isEmail: true}},
    default: {type: 'boolean', nullable: false, defaultTo: false},
    status: {type: 'string', maxlength: 50, nullable: false, defaultTo: 'active'},
    recipient_filter: {
        type: 'text',
        maxlength: 1000000000,
        nullable: false,
        defaultTo: ''
    },
    subscribe_on_signup: {type: 'boolean', nullable: false, defaultTo: false},
    sort_order: {type: 'integer', nullable: false, unsigned: true, defaultTo: 0}
});
