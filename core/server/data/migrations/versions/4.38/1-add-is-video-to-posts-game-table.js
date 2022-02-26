const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration(
  'posts_game',
  'is_video',
  { type: 'bool', nullable: false, defaultTo: false }
);
