const {createAddIndexMigration} = require('../../utils');

module.exports = createAddIndexMigration('members', ['email_disabled']);