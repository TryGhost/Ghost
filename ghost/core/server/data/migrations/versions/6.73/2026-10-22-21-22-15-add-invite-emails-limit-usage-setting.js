const { addSetting } = require('../../utils');

module.exports = addSetting({
  key: 'invite_emails_limit_usage',
  value: null,
  type: 'object',
  group: 'core',
});
