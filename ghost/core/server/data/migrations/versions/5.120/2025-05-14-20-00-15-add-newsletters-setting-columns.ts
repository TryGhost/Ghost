import { combineNonTransactionalMigrations, createAddColumnMigration } from '../../utils';

export default combineNonTransactionalMigrations(
  createAddColumnMigration('newsletters', 'title_font_weight', {
    type: 'string',
    maxlength: 50,
    nullable: false,
    defaultTo: 'bold',
  }),
  createAddColumnMigration('newsletters', 'link_style', {
    type: 'string',
    maxlength: 50,
    nullable: false,
    defaultTo: 'underline',
  }),
  createAddColumnMigration('newsletters', 'image_corners', {
    type: 'string',
    maxlength: 50,
    nullable: false,
    defaultTo: 'square',
  }),
);
