const {createAddIndexMigration} = require('../../utils');

module.exports = createAddIndexMigration('members', ['email_click_rate']);
