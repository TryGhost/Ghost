import type {
  AutomationRunHistory,
  AutomationRunPlan,
} from '@tryghost/admin-x-framework/api/automation-run-history';
import { emailTextExcerpt } from './history-email-preview';
import { waitDuration, type HistoryCardData } from './run-history';

export function mapUpcomingRunSteps(
  history: AutomationRunHistory,
  plan: AutomationRunPlan,
  now = Date.now(),
): HistoryCardData[] {
  if (history.status !== 'in_progress' || plan.status === 'inactive') {
    return [];
  }
  const pending = history.steps.filter((step) => step.status === 'pending');
  if (pending.length !== 1 || history.steps.at(-1) !== pending[0]) {
    throw new Error('Active history must end with one pending step');
  }
  const anchor = pending[0].action.id;
  const actions = new Map(plan.actions.map((action) => [action.id, action]));
  const visited = new Set([anchor]);
  const cards: HistoryCardData[] = [];
  let current = anchor;
  // Eligibility is recorded; later execution dates are estimates. An overdue
  // pending step can only continue from now, and each future wait adds its delay.
  let expected = history.member ? Math.max(Date.parse(pending[0].ready_at), now) : undefined;
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
    const startsAt = expected;
    switch (next.type) {
      case 'wait': {
        const duration = waitDuration(next.data.wait_hours);
        if (next.data.wait_hours === null || !duration) {
          throw new Error('Invalid upcoming wait duration');
        }
        if (expected !== undefined) {
          expected += next.data.wait_hours * 60 * 60 * 1000;
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
    if (expected !== undefined) {
      cards[cards.length - 1].timestamp = {
        label: 'est.',
        value: new Date(expected).toISOString(),
        estimated: true,
        ...(next.type === 'wait' && startsAt !== undefined
          ? { rangeStart: new Date(startsAt).toISOString() }
          : {}),
      };
    }
    current = next.id;
  }
  cards.push({
    id: `end:${history.id}`,
    kind: 'end',
    title: 'Completed',
    state: 'planned',
    statusLabel: 'Not reached',
  });
  return cards;
}
