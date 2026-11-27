import type { AutomationPerformanceStats } from '@tryghost/admin-x-framework/api/automations';
import { formatNumber } from '@tryghost/shade/utils';

export const mapAutomationStatusStats = (stats: AutomationPerformanceStats) => ({
  inProgress: formatNumber(stats.in_progress_run_count),
  completed: formatNumber(stats.completed_run_count),
  exitedEarly: formatNumber(stats.exited_early_run_count),
});

export type AutomationStatusCardsData = ReturnType<typeof mapAutomationStatusStats>;
