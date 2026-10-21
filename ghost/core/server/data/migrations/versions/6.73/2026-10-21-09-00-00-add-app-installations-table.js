const { addTable } = require('../../utils');

// Takes the table out of development, so `replaceDevelopmentCopy` replaces the copy that
// development and testing databases already have.
module.exports = addTable(
  'app_installations',
  {
    id: { type: 'string', maxlength: 24, nullable: false, primary: true },
    app_id: { type: 'string', maxlength: 191, nullable: false, index: true },
    current_app_id: { type: 'string', maxlength: 191, nullable: true, unique: true },
    status: {
      type: 'string',
      maxlength: 50,
      nullable: false,
      validations: { isIn: [['active', 'suspended', 'uninstalled']] },
    },
    manifest_id: { type: 'string', maxlength: 24, nullable: false },
    pending_manifest_id: { type: 'string', maxlength: 24, nullable: true },
    revision: { type: 'integer', nullable: false, unsigned: true, defaultTo: 0 },
    created_at: { type: 'dateTime', nullable: false },
    updated_at: { type: 'dateTime', nullable: true },
  },
  { replaceDevelopmentCopy: true },
);
