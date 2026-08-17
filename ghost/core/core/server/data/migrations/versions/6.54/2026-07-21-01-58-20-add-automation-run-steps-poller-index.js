const {createAddIndexMigration} = require('../../utils');

module.exports = createAddIndexMigration('automation_run_steps', ['status', 'ready_at', 'created_at', 'id']);
