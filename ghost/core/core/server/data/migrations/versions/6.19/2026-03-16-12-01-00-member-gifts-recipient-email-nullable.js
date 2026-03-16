const {createSetNullableMigration} = require('../../utils');

module.exports = createSetNullableMigration('member_gifts', 'recipient_email');
