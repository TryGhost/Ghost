import { createAddColumnMigration, combineNonTransactionalMigrations } from '../../utils';

export default combineNonTransactionalMigrations(
  createAddColumnMigration('newsletters', 'header_background_color', {
    type: 'string',
    maxlength: 50,
    nullable: false,
    defaultTo: 'transparent',
  }),

  createAddColumnMigration('newsletters', 'section_title_color', {
    type: 'string',
    maxlength: 50,
    nullable: true,
  }),

  createAddColumnMigration('newsletters', 'divider_color', {
    type: 'string',
    maxlength: 50,
    nullable: true,
  }),

  createAddColumnMigration('newsletters', 'button_color', {
    type: 'string',
    maxlength: 50,
    nullable: true,
  }),

  createAddColumnMigration('newsletters', 'link_color', {
    type: 'string',
    maxlength: 50,
    nullable: true,
  }),
);
