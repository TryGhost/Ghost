import { addPermissionToRole } from '../../utils';

// Follow-up to the gift-links data foundation: grant Admin Integration (API
// keys) the same per-post `manage` permission Editors/Authors have, so gift
// links can be created/reset programmatically over the Admin API. The
// site-wide `resetAll` kill switch stays Administrator-only.
export default addPermissionToRole({
  permission: 'Manage gift links',
  role: 'Admin Integration',
});
