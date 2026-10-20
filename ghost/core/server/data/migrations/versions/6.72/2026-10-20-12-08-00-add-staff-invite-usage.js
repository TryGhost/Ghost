const { addTable } = require('../../utils');

module.exports = addTable('staff_invite_usage', {
  key: { type: 'string', maxlength: 191, nullable: false, primary: true },
  count: { type: 'integer', nullable: false, defaultTo: 0 },
});
