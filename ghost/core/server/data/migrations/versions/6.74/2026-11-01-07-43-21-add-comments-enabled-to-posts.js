const { createAddColumnMigration } = require('../../utils');

module.exports = createAddColumnMigration('posts', 'comments_enabled', {
  type: 'boolean',
  nullable: false,
  defaultTo: true,
});
