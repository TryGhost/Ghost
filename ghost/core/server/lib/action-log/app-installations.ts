import type {
  AppInstallationChange,
  OnAppInstallationUpdated,
} from '../../services/app-installations/changes';
import type { ApprovalContext } from '../../services/app-installations/history';
import type { ActionLog, ActionRow } from './action-log';

type AppInstallationAction = Extract<ActionRow, { resourceType: 'app_installation' }>;

/**
 * Logs the changes the app installations service reports. This is the only place that knows how
 * an app installation change reads in Admin's History; the service only says what happened.
 */
export function recordAppInstallationChanges(actionLog: ActionLog): OnAppInstallationUpdated {
  return async (trx, context, change) => {
    await actionLog.record(trx, context, actionFor(change));
  };
}

function actionFor(change: AppInstallationChange): AppInstallationAction {
  switch (change.type) {
    case 'AppInstalled':
      return appAction('installed', change.next.id, {
        id: change.next.app_id,
        name: change.next.manifest.name,
      });
    case 'AppChangesApproved':
      return appAction(
        'changes_approved',
        change.next.id,
        { id: change.next.app_id, name: change.approvedManifest.name },
        {
          from_manifest_id: change.previous.manifest_id,
          to_manifest_id: change.approvedManifest.id,
        },
      );
    case 'AppUninstalled':
      return appAction('uninstalled', change.previous.id, {
        id: change.previous.app_id,
        name: change.previous.manifest.name,
      });
  }
}

/**
 * Staff history is where "who installed this, and when" lives; the installation itself does
 * not hold it. The resource is the installation, and the app's name and ID ride along, so the
 * history still reads as "Podcast" long after the manifest has changed.
 */
function appAction(
  event: AppInstallationAction['event'],
  installationId: string,
  app: { id: string; name: string },
  // The app's own history reads these back, so the two share one type.
  approval?: ApprovalContext,
): AppInstallationAction {
  return {
    resourceType: 'app_installation',
    event,
    resourceId: installationId,
    primaryName: app.name,
    context: { app_id: app.id, ...approval },
  };
}
