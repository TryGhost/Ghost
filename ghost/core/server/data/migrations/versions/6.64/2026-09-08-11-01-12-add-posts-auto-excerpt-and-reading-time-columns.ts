import { combineNonTransactionalMigrations, createAddColumnMigration } from '../../utils';

const addPostsColumn = (name: any, definition: any) =>
  createAddColumnMigration('posts', name, definition, { algorithm: 'auto' });

export default combineNonTransactionalMigrations(
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
