import type {
  AutomationRunHistory,
  AutomationRunPlan,
} from '@tryghost/admin-x-framework/api/automation-run-history';
import { waitDuration, type HistoryCardData } from './run-history';

export const mapUpcomingRunSteps = (
  history: AutomationRunHistory,
  plan: AutomationRunPlan,
  now = Date.now(),
): { cards: HistoryCardData[]; message: string } => {
  const unavailable = (reason: string) => ({
    cards: [],
    message: `Upcoming steps are unavailable. ${reason}`,
  });
  if (history.status !== 'in_progress') {
    return { cards: [], message: '' };
  }
  if (plan.id !== history.automation_id) {
    return unavailable('The saved workflow does not belong to this automation.');
  }
  if (plan.status === 'inactive') {
    return { cards: [], message: 'This automation is off. No further steps will run.' };
  }
  const pending = history.steps.filter((step) => step.status === 'pending');
  const anchor = pending[0]?.action?.id;
  if (pending.length !== 1 || !anchor || history.steps.at(-1) !== pending[0]) {
    return unavailable(
      'The recorded history does not identify a single queued step to continue from.',
    );
  }
  const actions = new Map(plan.actions.map((action) => [action.id, action]));
  if (!actions.has(anchor)) {
    return unavailable('The queued step is no longer in the saved workflow.');
  }
  if (actions.size !== plan.actions.length) {
    return unavailable('The saved workflow does not define a single path forward.');
  }
  const visited = new Set([anchor]);
  const cards: HistoryCardData[] = [];
  let current = anchor;
  // Overdue steps (including static seed data) cannot put future execution in
  // the past. Estimate from now until the pending step actually completes.
  let expected = history.member ? Math.max(Date.parse(pending[0].ready_at), now) : NaN;
  while (true) {
    const edges = plan.edges.filter((edge) => edge.source_action_id === current);
    if (edges.length === 0) {
      break;
    }
    const next = actions.get(edges[0].target_action_id);
    if (edges.length !== 1 || !next || visited.has(next.id)) {
      // A broken or ambiguous graph must not look like a complete future path.
      return unavailable('The saved workflow does not define a single path forward.');
    }
    visited.add(next.id);
    const duration = next.type === 'wait' ? waitDuration(next.data.wait_hours) : null;
    if (next.type === 'wait') {
      expected = duration ? expected + next.data.wait_hours! * 60 * 60 * 1000 : NaN;
    }
    const expectedDate = new Date(expected);
    cards.push({
      id: `planned:${next.id}`,
      kind: next.type === 'wait' ? 'wait' : 'email',
      title: next.type === 'wait' ? (duration ? `Wait ${duration}` : 'Wait') : 'Send email',
      state: 'planned',
      statusLabel: 'Not reached',
      timestamp: Number.isFinite(expectedDate.getTime())
        ? {
            label: 'est.',
            value: expectedDate.toISOString(),
            estimated: true,
          }
        : undefined,
      details: next.type === 'wait' && !duration ? ['Wait duration unavailable.'] : [],
    });
    current = next.id;
  }
  return {
    cards,
    message: '',
  };
};
