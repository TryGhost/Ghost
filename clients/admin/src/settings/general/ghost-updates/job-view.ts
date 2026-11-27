import { activeUpgradeStates } from '@tryghost/admin-x-framework/api/upgrades';
import type { UpgradeJobResult } from '@tryghost/admin-x-framework/api/upgrades';

/** A Shade Banner variant. */
export type JobVariant = 'info' | 'success' | 'warning' | 'destructive';

export interface JobView {
  variant: JobVariant;
  title: string;
  description?: string;
  /** No further state change will come from the host. */
  final: boolean;
}

/** Ghost could not reach itself for longer than the reconnect window allows. */
export const STALLED_VIEW: JobView = {
  variant: 'warning',
  title: 'Lost contact with Ghost',
  description:
    'Ghost has not responded for several minutes. The update may still be running. Reload this page to check again, or check the update service on your server.',
  final: true,
};

const stageTitles: Record<(typeof activeUpgradeStates)[number], string> = {
  pending: 'Waiting for the update to start',
  'backing-up': 'Backing up your site',
  pulling: 'Downloading the new version',
  restarting: 'Restarting Ghost',
  verifying: 'Checking the new version',
  restoring: 'The update failed — restoring your site',
};

export function isActiveState(state: string): boolean {
  return (activeUpgradeStates as readonly string[]).includes(state);
}

export function jobView(job: UpgradeJobResult): JobView {
  if (isActiveState(job.state)) {
    return {
      variant: job.state === 'restoring' ? 'warning' : 'info',
      title: stageTitles[job.state as keyof typeof stageTitles],
      description: 'Your site will be unavailable for a short time while Ghost restarts.',
      final: false,
    };
  }

  const from = 'from_version' in job && job.from_version ? ` ${job.from_version}` : '';
  const to = 'to_version' in job ? ` ${job.to_version}` : '';

  switch (job.state) {
    case 'done':
      return {
        variant: 'success',
        title: `Updated to${to}`,
        description: 'Reload Admin to start using the new version.',
        final: true,
      };
    case 'restored':
      return {
        variant: 'destructive',
        title: 'The update failed',
        description: `Your site was restored to${from || ' its previous version'} and is running normally.`,
        final: true,
      };
    case 'needs-operator':
      return {
        variant: 'destructive',
        title: 'The update needs attention',
        description:
          'The update could not finish or be undone automatically. Your site may be unavailable until it is fixed on your server.',
        final: true,
      };
    case 'refused':
      return {
        variant: 'warning',
        title: 'The update was not started',
        description: 'Nothing was changed. You can try again later.',
        final: true,
      };
    case 'interrupted':
      return {
        variant: 'destructive',
        title: 'The update was interrupted',
        description: 'The update stopped part way through. Check your site before trying again.',
        final: true,
      };
    default:
      return {
        variant: 'warning',
        title: 'Ghost could not find this update',
        description:
          job.state === 'expired'
            ? 'Its record has expired. Check the version above to see whether it finished.'
            : 'The update service has no record of it. Check the version above to see whether it finished.',
        final: true,
      };
  }
}
