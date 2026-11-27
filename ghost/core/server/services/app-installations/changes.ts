import { Added, Edited, type OnUpdated } from '../../lib/changes';
import type { Installation } from './codec';

/** An app was installed. */
export class AppInstalled extends Added('AppInstalled')<Installation> {}

/** A change to an installed app's manifest was approved. */
export class AppChangesApproved extends Edited('AppChangesApproved')<Installation> {
  /**
   * The manifest the approval stored, with the name the app gives itself in it. It is not always
   * the manifest the installation now runs: an approval can store a manifest that still waits on
   * something else.
   */
  readonly approvedManifest: { id: string; name: string };

  constructor(
    previous: Installation,
    next: Installation,
    approvedManifest: { id: string; name: string },
  ) {
    super(previous, next);
    this.approvedManifest = approvedManifest;
  }
}

/**
 * An app was uninstalled. The installation is kept as a record of what was installed, so this
 * is an edit of it: `previous` is the installation while installed, `next` once uninstalled.
 */
export class AppUninstalled extends Edited('AppUninstalled')<Installation> {}

/** A change an app installations command made, in the service's own terms. */
export type AppInstallationChange = AppInstalled | AppChangesApproved | AppUninstalled;

/** The function the app installations service calls with each change it makes. */
export type OnAppInstallationUpdated = OnUpdated<AppInstallationChange>;
