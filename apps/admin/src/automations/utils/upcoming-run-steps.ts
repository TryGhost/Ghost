import type {
  AutomationRunHistory,
  AutomationRunPlan,
} from '@tryghost/admin-x-framework/api/automation-run-history';
import { emailTextExcerpt } from './history-email-preview';
import { waitDuration, type HistoryCardData } from './run-history';

export type UpcomingRunSteps = { cards: HistoryCardData[]; message: string };

export function mapUpcomingRunSteps(
  history: AutomationRunHistory,
  plan: AutomationRunPlan,
): UpcomingRunSteps {
  if (history.status !== 'in_progress') {
    return { cards: [], message: '' };
  }
  if (plan.status === 'inactive') {
    return { cards: [], message: 'This automation is off. No further steps will run.' };
  }
  const pending = history.steps.filter((step) => step.status === 'pending');
  if (pending.length !== 1 || history.steps.at(-1) !== pending[0]) {
    throw new Error('Active history must end with one pending step');
  }
  const anchor = pending[0].action.id;
  const actions = new Map(plan.actions.map((action) => [action.id, action]));
  if (!actions.has(anchor)) {
    return {
      cards: [],
      message:
        'Upcoming steps are unavailable. The queued step is no longer in the saved workflow.',
    };
  }
  const visited = new Set([anchor]);
  const cards: HistoryCardData[] = [];
  let current = anchor;
  while (true) {
    const edges = plan.edges.filter((edge) => edge.source_action_id === current);
    if (edges.length === 0) {
      break;
    }
    const next = actions.get(edges[0].target_action_id);
    if (edges.length !== 1 || !next || visited.has(next.id)) {
      throw new Error('The saved workflow must define a single path forward');
    }
    visited.add(next.id);
    const base = {
      id: `planned:${next.id}`,
      state: 'planned' as const,
      statusLabel: 'Not reached',
    };
    switch (next.type) {
      case 'wait': {
        const duration = waitDuration(next.data.wait_hours);
        if (!duration) {
          throw new Error('Invalid upcoming wait duration');
        }
        cards.push({ ...base, kind: 'wait', title: `Wait ${duration}` });
        break;
      }
      case 'send_email':
        cards.push({
          ...base,
          kind: 'email',
          title: 'Send email',
          email: {
            subject: next.data.email_subject,
            text: emailTextExcerpt(next.data.email_lexical),
          },
        });
        break;
      default:
        throw new Error(`Unknown upcoming action: ${String(next satisfies never)}`);
    }
    current = next.id;
  }
  cards.push({
    id: `end:${history.id}`,
    kind: 'end',
    title: 'End of automation',
    state: 'planned',
    statusLabel: 'Not reached',
  });
  return { cards, message: '' };
}
