const {createDropNullableMigration} = require('../../utils');

module.exports = createDropNullableMigration('gifts', 'expires_at');
