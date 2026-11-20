const { addTable } = require('../../utils');

// Takes the table out of development, so `replaceDevelopmentCopy` replaces the copy that
// development and testing databases already have.
module.exports = addTable(
  'app_installation_manifests',
  {
    id: { type: 'string', maxlength: 24, nullable: false, primary: true },
    installation_id: {
      type: 'string',
      maxlength: 24,
      nullable: false,
      references: 'app_installations.id',
    },
    manifest_url: { type: 'string', maxlength: 2000, nullable: false },
    manifest: { type: 'text', maxlength: 65535, nullable: false },
    digest: { type: 'string', maxlength: 64, nullable: false },
    source: {
      type: 'string',
      maxlength: 50,
      nullable: false,
      validations: { isIn: [['install', 'approval', 'update', 'resume']] },
    },
    requires_approval: { type: 'boolean', nullable: false, defaultTo: false },
    created_at: { type: 'dateTime', nullable: false },
  },
  { replaceDevelopmentCopy: true },
);
