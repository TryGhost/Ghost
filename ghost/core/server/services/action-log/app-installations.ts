import type { Installation } from '../app-installations/codec';
import type { AppInstallationEvent } from '../app-installations/events';
import { createActionLog, type ActionDescription } from './action-log';
import type { ActionName } from './kinds';

/**
 * The app's name and ID from its manifest, stored with the action so the action log still shows
 * them if the app changes.
 */
function describeApp(
  installation: Installation,
  actionName: ActionName<'app_installation'>,
  details: Record<string, unknown> = {},
): ActionDescription<ActionName<'app_installation'>> {
  return {
    name: installation.manifest.name,
    actionName,
    details: { app_id: installation.app_id, ...details },
  };
}

export const appInstallationActionLog = createActionLog<
  'app_installation',
  Installation,
  AppInstallationEvent
>({
  idOf: (installation) => installation.id,
  describe: (event) => {
    switch (event.type) {
      case 'AppInstalled':
        return describeApp(event.next, 'installed');
      case 'AppChangesApproved':
        return describeApp(event.next, 'changes_approved', {
          from_manifest_id: event.fromManifestId,
          to_manifest_id: event.toManifestId,
        });
      case 'AppUninstalled':
        return describeApp(event.previous, 'uninstalled');
    }
  },
});
