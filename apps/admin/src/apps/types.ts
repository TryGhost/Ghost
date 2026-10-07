import type { AppPermission } from './lib/app-permissions';

/**
 * The contract between an app and Ghost (manifest v0). The format stays fluid
 * while only internal apps exist; versioning comes before external developers.
 */
export interface AppManifest {
  name: string;
  /** Who makes the app, as the publisher should know them. Self-declared. */
  developer?: string;
  description?: string;
  /** A Lucide icon name, e.g. `calendar-days`, so it matches Ghost's icons. */
  icon?: string;
  /** The app's brand colour as `#rrggbb`, behind its icon and install banner. */
  color?: string;
  /** Absolute URL of the page Ghost loads in the app's iframe. */
  url: string;
  /** Where the app appears. Only an Admin page for now. */
  surfaces: AppSurface[];
  /** Pages Ghost lists under the app in the sidebar. The app's name links to `/`. */
  nav?: AppNavItem[];
}

export interface AppNavItem {
  label: string;
  /** Relative to the app's root, e.g. `/week`. */
  path: string;
}

export type AppSurface = 'page';

export type InstallationStatus = 'active' | 'uninstalled';

/** One site's approval of one app. Reinstalling always creates a new one. */
export interface AppInstallation {
  id: string;
  /** Where the manifest came from, so it can be re-checked later. */
  manifestUrl: string;
  /** The manifest exactly as the publisher approved it. */
  manifest: AppManifest;
  /** Sideloaded from an install link, as opposed to a future directory. */
  source: 'link';
  status: InstallationStatus;
  installedAt: string;
  installedBy?: { id: string; name: string };
  uninstalledAt?: string;
  /** Exploration: the access the publisher approved (see lib/app-permissions). */
  permissions?: AppPermission[];
  /**
   * Exploration: more access an updated app asks for. Until it's approved, the
   * app doesn't open; Admin asks the publisher to review it instead.
   */
  pendingPermissions?: AppPermission[];
}
