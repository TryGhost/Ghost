import type { AppInstallation } from '@tryghost/admin-x-framework/api/app-installations';
import { appDetailsRoute, appOpenRoute, appRoute } from './routes';

/**
 * Whether apps can be used on this site: `loading` until Admin knows, then `supported`, or
 * `unsupported` where Ghost can't issue apps their tokens.
 */
export type AppsAvailability = 'loading' | 'supported' | 'unsupported';

/** What Admin offers for one installation, wherever it shows it. */
export interface InstallationActions {
  /** Its page opens. */
  canOpen: boolean;
  /** It waits for approval, and its changes can be reviewed. */
  canReview: boolean;
  /** It can be pinned to the sidebar, or unpinned. */
  canPin: boolean;
  /**
   * Where its row in the Apps list leads: the app itself, which says what it's waiting for when
   * it can't open, or its details where no app opens.
   */
  rowTo: string;
  /**
   * Where a shortcut to it leads, in the sidebar and in search: its page, or the review of its
   * changes while it's suspended. Null when there's nothing to open, so it gets no shortcut.
   */
  shortcutTo: string | null;
}

/**
 * The one answer to what can be done with an installation, from its status, whether apps can be
 * used on this site, and whether the staff user's pins have loaded. Every screen that lists or
 * shows an installation asks here, so they can't disagree.
 *
 * Where apps can't be used, or Admin doesn't know yet, nothing that opens, reviews or pins an
 * app is offered; listing it, its details and uninstalling it need none of this.
 */
export function installationActions(
  installation: Pick<AppInstallation, 'id' | 'status' | 'manifest_url'>,
  availability: AppsAvailability,
  pins?: { isLoaded: boolean },
): InstallationActions {
  const usable = availability === 'supported' && installation.status !== 'uninstalled';
  return {
    canOpen: usable && installation.status === 'active',
    canReview: usable && installation.status === 'suspended',
    canPin: usable && pins?.isLoaded === true,
    rowTo: usable ? appRoute(installation.id) : appDetailsRoute(installation.id),
    shortcutTo: usable ? appOpenRoute(installation) : null,
  };
}
