const { createAddColumnMigration } = require('../../utils');

module.exports = createAddColumnMigration('app_installation_manifests', 'icon_svg', {
  type: 'text',
  maxlength: 65535,
  nullable: true,
});
