import { formatNumber } from '@tryghost/shade/utils';
import type { ContentCSVProgress } from '@tryghost/admin-x-framework/api/posts';

export type TrackedImport = ContentCSVProgress & { stale: boolean };

export function isImportFinished(status: ContentCSVProgress['status']) {
  return status === 'complete' || status === 'failed' || status === 'cancelled';
}

export function importPercentage({ processed, total }: ContentCSVProgress): number | null {
  return total !== null && total > 0
    ? Math.min(100, Math.max(0, Math.floor((processed / total) * 100)))
    : null;
}

export function importProgressLabel(progress: TrackedImport) {
  if (progress.stale) {
    return 'Reconnecting…';
  }
  if (progress.status === 'complete') {
    return 'Complete';
  }
  if (progress.status === 'failed') {
    return 'Failed';
  }
  if (progress.status === 'cancelled') {
    return 'Cancelled';
  }
  if (progress.status === 'cancelling') {
    return 'Stopping…';
  }
  if (progress.status === 'queued') {
    return 'Queued';
  }
  if (progress.status === 'finalizing') {
    return 'Finishing…';
  }
  const percentage = importPercentage(progress);
  return percentage === null ? 'Importing…' : `${formatNumber(percentage)}%`;
}
