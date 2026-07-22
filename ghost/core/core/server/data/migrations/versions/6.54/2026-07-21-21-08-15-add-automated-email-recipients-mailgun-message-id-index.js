const {createAddIndexMigration} = require('../../utils');

module.exports = createAddIndexMigration('automated_email_recipients', ['mailgun_message_id'], {length: 31});
