const { createDropNullableMigration } = require('../../utils');

module.exports = createDropNullableMigration('automations', 'trigger_type');
