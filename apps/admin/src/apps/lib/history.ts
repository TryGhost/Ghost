import type { AppInstallationHistoryEntry } from '@tryghost/admin-x-framework/api/app-installations';

/**
 * Admin and Ghost deploy separately, so Ghost may send an event this Admin doesn't know yet.
 * It shows as "Changed".
 */
export function historyTitle(entry: AppInstallationHistoryEntry): string {
  switch (entry.event) {
    case 'installed':
      return 'Installed';
    case 'updated':
      return 'Updated';
    case 'suspended':
      return 'Updated, needs approval';
    case 'changes_approved':
      return entry.moved_to ? `Moved to ${entry.moved_to}` : 'Changes approved';
    case 'uninstalled':
      return 'Uninstalled';
    default:
      return 'Changed';
  }
}

export function installedBy(history: AppInstallationHistoryEntry[]): string | undefined {
  return history.find((entry) => entry.event === 'installed')?.actor?.name ?? undefined;
}
