import { removePermissionFromRole } from '../../utils';

// Authors cannot change post visibility, so they should not be able to manage gift
// links either. Drop the over-broad grant added in the original gift links rollout.
export default removePermissionFromRole({
  permission: 'Manage gift links',
  role: 'Author',
});
