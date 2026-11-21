import { createAddColumnMigration } from '../../utils';

export default createAddColumnMigration('emails', 'track_clicks', {
  type: 'boolean',
  nullable: false,
  defaultTo: false,
});
