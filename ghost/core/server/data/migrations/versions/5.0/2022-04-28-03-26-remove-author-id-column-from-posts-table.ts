import { createDropColumnMigration } from '../../utils';

// @ts-expect-error empty column definition; down is replaced below
const migration = createDropColumnMigration('posts', 'author_id', {});

migration.down = async () => {
  // noop - major version migrations are not backwards compatible
};

export default migration;
