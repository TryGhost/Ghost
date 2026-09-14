import type { AutomationStatusStats } from '@tryghost/admin-x-framework/api/automations';
import { formatNumber } from '@tryghost/shade/utils';

export const mapAutomationStatusStats = (stats: AutomationStatusStats) => ({
  inProgress: formatNumber(stats.in_progress_run_count),
  completed: formatNumber(stats.completed_run_count),
  exitedEarly: formatNumber(stats.exited_early_run_count),
  incompleteMessage:
    stats.unclassified_run_count > 0
      ? `Status is unavailable for ${formatNumber(stats.unclassified_run_count)} ${stats.unclassified_run_count === 1 ? 'entry' : 'entries'}.`
      : undefined,
});

export type AutomationStatusCardsData = ReturnType<typeof mapAutomationStatusStats>;
