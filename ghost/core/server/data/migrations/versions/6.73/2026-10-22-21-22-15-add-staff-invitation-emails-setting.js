const { addSetting } = require('../../utils');

module.exports = addSetting({
  key: 'staff_invitation_emails',
  value: null,
  type: 'object',
  group: 'core',
});
