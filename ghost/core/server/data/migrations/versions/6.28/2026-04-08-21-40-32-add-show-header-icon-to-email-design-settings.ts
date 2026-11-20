import { createAddColumnMigration } from '../../utils';

export default createAddColumnMigration('email_design_settings', 'show_header_icon', {
  type: 'boolean',
  nullable: false,
  defaultTo: true,
});
