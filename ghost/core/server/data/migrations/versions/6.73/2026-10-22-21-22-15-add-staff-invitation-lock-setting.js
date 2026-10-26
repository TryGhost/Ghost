const { addSetting } = require('../../utils');

module.exports = addSetting({
  key: 'staff_invitation_lock',
  value: null,
  type: 'string',
  group: 'core',
});
