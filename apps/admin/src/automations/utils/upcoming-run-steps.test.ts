import { describe, expect, it } from 'vitest';
import type {
  AutomationRunHistory,
  AutomationRunPlan,
} from '@tryghost/admin-x-framework/api/automation-run-history';
import { mapUpcomingRunSteps } from './upcoming-run-steps';
import { mapRunHistory } from './run-history';

const entered = '2026-09-10T12:00:00.000Z';
const eligible = '2026-09-13T12:00:00.000Z';
const step: AutomationRunHistory['steps'][number] = {
  id: 'step',
  email_sent_at: null,
  email_delivered_at: null,
  automation_action_revision_id: 'revision',
  status: 'pending',
  created_at: entered,
  ready_at: eligible,
  started_at: null,
  finished_at: null,
  updated_at: entered,
  action: { id: 'old-wait', type: 'wait', data: { wait_hours: 72 } },
};
const active: AutomationRunHistory = {
  id: 'run',
  automation_id: 'automation',
  created_at: entered,
  member: { id: 'member', name: 'Alex', email: 'alex@example.com' },
  status: 'in_progress',
  failed: false,
  steps: [step],
};

describe('upcoming downstream steps', () => {
  const plan: AutomationRunPlan = {
    id: active.automation_id,
    status: 'active',
    actions: [
      {
        id: 'email',
        type: 'send_email',
        data: { email_subject: 'Current saved email', email_lexical: '' },
      },
      { id: 'old-wait', type: 'wait', data: { wait_hours: 24 } },
      { id: 'next-wait', type: 'wait', data: { wait_hours: 48 } },
      { id: 'disconnected', type: 'wait', data: { wait_hours: 240 } },
    ],
    edges: [
      { source_action_id: 'next-wait', target_action_id: 'email' },
      { source_action_id: 'old-wait', target_action_id: 'next-wait' },
    ],
  };

  it('follows saved edges after the pending action and marks the future path distinctly', () => {
    const upcoming = mapUpcomingRunSteps(active, plan);
    expect(upcoming.map(({ id }) => id)).toEqual(['planned:next-wait', 'planned:email', 'end:run']);
    expect(upcoming[0]).toMatchObject({
      state: 'planned',
      title: 'Wait 2 days',
      statusLabel: 'Not reached',
    });
    expect(upcoming[1].email?.subject).toBe('Current saved email');
  });

  it('estimates dates from recorded eligibility and accumulates downstream waits', () => {
    const extended = {
      ...plan,
      actions: [
        ...plan.actions,
        { id: 'short-wait', type: 'wait' as const, data: { wait_hours: 0.5 } },
      ],
      edges: [
        ...plan.edges.filter((edge) => edge.target_action_id !== 'email'),
        { source_action_id: 'next-wait', target_action_id: 'short-wait' },
        { source_action_id: 'short-wait', target_action_id: 'email' },
      ],
    };
    const cards = mapUpcomingRunSteps(active, extended, Date.parse(entered));
    expect(cards.map((card) => card.timestamp?.value)).toEqual([
      '2026-09-15T12:00:00.000Z',
      '2026-09-15T12:30:00.000Z',
      '2026-09-15T12:30:00.000Z',
      undefined,
    ]);
    expect(cards.map((card) => card.timestamp?.rangeStart)).toEqual([
      eligible,
      '2026-09-15T12:00:00.000Z',
      undefined,
      undefined,
    ]);
    expect(cards[0].timestamp).toMatchObject({ label: 'est.', estimated: true });
  });

  it('estimates an overdue pending step from now without changing its recorded eligibility', () => {
    const cards = mapUpcomingRunSteps(active, plan, Date.parse('2026-09-20T15:00:00.000Z'));
    expect(cards[0].timestamp?.value).toBe('2026-09-22T15:00:00.000Z');
    expect(cards[0].timestamp?.rangeStart).toBe('2026-09-20T15:00:00.000Z');
    expect(cards[1].timestamp?.value).toBe(cards[0].timestamp?.value);
    expect(cards[1].timestamp?.rangeStart).toBeUndefined();
    expect(mapRunHistory(active).at(-1)?.timestamp?.value).toBe(eligible);
  });

  it('keeps upcoming steps without dates when the member has been deleted', () => {
    const cards = mapUpcomingRunSteps({ ...active, member: null }, plan);
    expect(cards).toHaveLength(3);
    expect(cards.every((card) => !card.timestamp)).toBe(true);
  });

  it('shows only the end marker when the pending step is the final saved action', () => {
    expect(mapUpcomingRunSteps(active, { ...plan, edges: [] }).map(({ title }) => title)).toEqual([
      'Completed',
    ]);
  });

  it('shows the end marker after a pending action removed from the saved workflow', () => {
    const result = mapUpcomingRunSteps(active, {
      ...plan,
      actions: plan.actions.filter((action) => action.id !== 'old-wait'),
      edges: plan.edges.filter((edge) => edge.source_action_id !== 'old-wait'),
    });
    expect(result.map(({ title }) => title)).toEqual(['Completed']);
  });

  it('does not suggest more execution for an inactive automation', () => {
    expect(mapUpcomingRunSteps(active, { ...plan, status: 'inactive' })).toEqual([]);
  });

  it.each([
    { status: 'completed', stepStatus: 'finished' },
    { status: 'exited_early', stepStatus: 'failed' },
  ] as const)('does not append plans to $status runs', ({ status, stepStatus }) => {
    const ended: AutomationRunHistory = {
      ...active,
      status,
      failed: stepStatus === 'failed',
      steps: [
        {
          ...step,
          status: stepStatus,
          started_at: eligible,
          finished_at: eligible,
          updated_at: eligible,
        },
      ],
    };
    expect(mapUpcomingRunSteps(ended, plan)).toEqual([]);
  });
});
