import { createAddColumnMigration } from '../../utils';

export default createAddColumnMigration(
  'posts',
  'social_web_share',
  {
    type: 'string',
    maxlength: 50,
    nullable: false,
    defaultTo: 'article',
    validations: { isIn: [['article', 'note', 'none']] },
  },
  { algorithm: 'instant' },
);
