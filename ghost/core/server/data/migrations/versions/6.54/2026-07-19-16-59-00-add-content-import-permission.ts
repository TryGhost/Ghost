import { addPermissionWithRoles } from '../../utils';

// Content import (the CSV posts importer) is restricted to Administrators
// (the Owner bypasses permission checks) and the self-serve migrator's
// integration, mirroring the existing db importContent permissions.
export default addPermissionWithRoles(
  {
    name: 'Import content',
    action: 'importContent',
    object: 'content_import',
  },
  ['Administrator', 'Self-Serve Migration Integration'],
);
