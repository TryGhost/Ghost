import type { AppInstallation } from '../app-installations/codec';
import { appInstallationEvents, type AppInstallationEvent } from '../app-installations/events';
import { createActionLog, type ActionDescription } from './action-log';

/**
 * The app's name and ID from its manifest, stored with the action so the action log still shows
 * them if the app changes.
 */
function describeApp(
  installation: AppInstallation,
  actionName: string,
  details: Record<string, unknown> = {},
): ActionDescription {
  return {
    name: installation.manifest.name,
    actionName,
    details: { app_id: installation.app_id, ...details },
  };
}

export const appInstallationActionLog = createActionLog<AppInstallation, AppInstallationEvent>({
  events: appInstallationEvents,
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
