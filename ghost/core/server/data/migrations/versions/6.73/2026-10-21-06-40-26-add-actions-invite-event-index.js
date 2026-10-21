const { createAddIndexMigration } = require('../../utils');

module.exports = createAddIndexMigration('actions', ['resource_type', 'event']);
