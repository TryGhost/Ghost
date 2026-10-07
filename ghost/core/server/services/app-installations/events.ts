import type { Added, Deleted, Edited } from '../../lib/change-events';
import type { Installation } from './codec';

/**
 * What happens to an app installation. Uninstalling ends an installation, which deletes it as
 * far as the site is concerned.
 */
export type AppInstallationEvent =
  | Added<'AppInstalled', Installation>
  | Edited<'AppChangesApproved', Installation, ApprovedManifests>
  | Deleted<'AppUninstalled', Installation>;

/** The manifest an installation ran before an approval, and the one it runs now. */
interface ApprovedManifests {
  fromManifestId: string;
  toManifestId: string;
}
