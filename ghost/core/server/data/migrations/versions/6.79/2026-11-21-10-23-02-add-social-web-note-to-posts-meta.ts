import { createAddColumnMigration } from '../../utils';

export default createAddColumnMigration(
  'posts_meta',
  'social_web_note',
  { type: 'string', maxlength: 2000, nullable: true },
  { algorithm: 'instant' },
);
