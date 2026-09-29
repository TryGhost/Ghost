const { addSetting } = require('../../utils');

module.exports = addSetting({
  key: 'robots_txt',
  value: '',
  type: 'string',
  group: 'site',
});
