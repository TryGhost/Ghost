const { addTable } = require('../../utils');

module.exports = addTable('tier_requirements', {
  port: { type: 'string', maxlength: 191, nullable: false, primary: true },
  tier_scope: {
    type: 'string',
    maxlength: 50,
    nullable: false,
    validations: { isIn: [['all_paid', 'selected_paid']] },
  },
  created_at: { type: 'dateTime', nullable: false },
  updated_at: { type: 'dateTime', nullable: true },
});
