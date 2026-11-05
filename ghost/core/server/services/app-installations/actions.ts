import type { ActionKind } from '../../lib/action-log/action-log';

/**
 * Installing adds an installation, approving changes edits it, and uninstalling ends it. Each
 * is named, so the history reads "installed" rather than "added".
 */
export const appInstallationActions = {
  resourceType: 'app_installation',
  table: 'app_installations',
  actionNames: { installed: 'added', changes_approved: 'edited', uninstalled: 'deleted' },
} as const satisfies ActionKind;

/** What happened to an installation, as its action names it. */
export type AppInstallationActionName = keyof typeof appInstallationActions.actionNames;
