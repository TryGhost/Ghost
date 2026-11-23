import { createAddColumnMigration } from '../../utils';

// What each manifest row differs by from the approved manifest when it was added, as JSON.
// Rows added before are filled in by the backfill that follows.
export default createAddColumnMigration('app_installation_manifests', 'changes', {
  type: 'text',
  maxlength: 65535,
  nullable: false,
});
