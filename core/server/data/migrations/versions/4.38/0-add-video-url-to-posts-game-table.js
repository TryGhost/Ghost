const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration(
  'posts_game',
  'video_url',
  { type: 'string', maxlength: 2000, nullable: true }
);
