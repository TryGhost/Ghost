const { createAddIndexMigration } = require('../../utils');

module.exports = createAddIndexMigration('actions', ['created_at']);
