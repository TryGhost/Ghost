import type { Added, Edited, OnUpdated } from '../../lib/changes';
import type { Installation } from './codec';

/** A change an app installations command made, in the service's own terms. */
export type AppInstallationChange =
  /** An app was installed. */
  | Added<'AppInstalled', Installation>
  /**
   * A change to an installed app's manifest was approved. `approvedManifest` is the manifest the
   * approval stored, with the name the app gives itself in it. It is not always the manifest the
   * installation now runs: an approval can store a manifest that still waits on something else.
   */
  | Edited<'AppChangesApproved', Installation, { approvedManifest: { id: string; name: string } }>
  /**
   * An app was uninstalled. The installation is kept as a record of what was installed, so this
   * is an edit of it: `previous` is the installation while installed, `next` once uninstalled.
   */
  | Edited<'AppUninstalled', Installation>;

/** The function the app installations service calls with each change it makes. */
export type OnAppInstallationUpdated = OnUpdated<AppInstallationChange>;
