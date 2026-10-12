const { combineNonTransactionalMigrations, createAddColumnMigration } = require('../../utils');

const addPostsColumn = (name, definition) =>
  createAddColumnMigration('posts', name, definition, { algorithm: 'auto' });

module.exports = combineNonTransactionalMigrations(
  addPostsColumn('auto_excerpt', {
    type: 'string',
    maxlength: 500,
    nullable: true,
  }),
  addPostsColumn('reading_time', {
    type: 'integer',
    unsigned: true,
    nullable: true,
  }),
);
