import type { AutomationRun } from '@tryghost/admin-x-framework/api/automations';
import { formatTimestamp } from '@tryghost/shade/utils';
import { formatMemberName } from '@/members/api';
import type { RunSortDirection } from '@/automations/types';

const statusLabels = {
  in_progress: 'In progress',
  completed: 'Completed',
  exited_early: 'Exited early',
  unclassified: 'Unclassified',
} as const;

const compareRuns = (a: AutomationRun, b: AutomationRun) => {
  const byTime = Date.parse(a.created_at) - Date.parse(b.created_at);
  if (byTime !== 0) {
    return Math.sign(byTime);
  }
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
};

export const isSortedRuns = (runs: AutomationRun[], direction: RunSortDirection) => {
  const expected = direction === 'asc' ? -1 : 1;
  return runs.every((run, index) => index === 0 || compareRuns(runs[index - 1], run) === expected);
};

export const mapAutomationRun = (run: AutomationRun) => ({
  id: run.id,
  memberName: run.member ? formatMemberName(run.member) : 'Deleted member',
  memberEmail: run.member?.name?.trim() ? run.member.email : undefined,
  enteredAt: run.created_at,
  enteredLabel: formatTimestamp(run.created_at),
  enteredDescription: new Date(run.created_at).toLocaleString(undefined, {
    dateStyle: 'full',
    timeStyle: 'long',
  }),
  status: run.status,
  failed: run.failed,
  statusLabel: run.failed ? 'Exited early — Failed' : statusLabels[run.status],
});

export const mapAutomationRuns = (runs: AutomationRun[]) => runs.map(mapAutomationRun);
