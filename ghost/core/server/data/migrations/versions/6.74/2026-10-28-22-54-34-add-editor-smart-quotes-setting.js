const { addSetting } = require('../../utils');

// editor_smart_quotes defaults to "true" in default-settings.json, so new
// sites get smart quotes switched on. Migrations only run when an existing
// site upgrades (fresh installs stamp them as complete without executing
// them), so this adds the setting switched off for sites that already have
// content written with straight quotes. It can be turned on in Settings.
module.exports = addSetting({
  key: 'editor_smart_quotes',
  value: 'false',
  type: 'boolean',
  group: 'editor',
});
