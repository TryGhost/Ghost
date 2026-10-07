import { createChangeEvents, type Added, type Deleted, type Edited } from '../../lib/change-events';
import type { AppInstallation } from './codec';

/**
 * What happens to an app installation. Uninstalling ends an installation, which deletes it as
 * far as the site is concerned.
 */
export type AppInstallationEvent =
  | Added<'AppInstalled', AppInstallation>
  | Edited<'AppChangesApproved', AppInstallation, ApprovedManifests>
  | Deleted<'AppUninstalled', AppInstallation>;

/** The manifest an installation ran before an approval, and the one it runs now. */
interface ApprovedManifests {
  fromManifestId: string;
  toManifestId: string;
}

/** The events the app installations service raises once each change is saved. */
export const appInstallationEvents = createChangeEvents<AppInstallationEvent>();
