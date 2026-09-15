import { describe, expect, it } from 'vitest';
import type {
  AutomationRunHistory,
  AutomationRunPlan,
} from '@tryghost/admin-x-framework/api/automation-run-history';
import { mapRunHistory } from './run-history';
import { mapUpcomingRunSteps } from './upcoming-run-steps';

const entered = '2026-09-10T12:00:00.000Z';
const eligible = '2026-09-13T12:00:00.000Z';
const finished = '2026-09-13T12:00:04.000Z';
const updated = '2026-09-15T12:00:00.000Z';
const step: AutomationRunHistory['steps'][number] = {
  id: 'step',
  automation_action_revision_id: 'revision',
  status: 'finished',
  created_at: entered,
  ready_at: eligible,
  started_at: eligible,
  finished_at: finished,
  updated_at: updated,
  action: { id: 'old-wait', type: 'wait', data: { wait_hours: 72 } },
};
const history: AutomationRunHistory = {
  id: 'run',
  automation_id: 'automation',
  created_at: entered,
  member: { id: 'member', name: 'Alex', email: 'alex@example.com' },
  status: 'completed',
  failed: false,
  history_status: 'available',
  steps: [step],
};

describe('upcoming downstream steps', () => {
  const active: AutomationRunHistory = {
    ...history,
    status: 'in_progress',
    steps: [{ ...step, status: 'pending', finished_at: null }],
  };
  const plan: AutomationRunPlan = {
    id: history.automation_id,
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

  it('follows saved edges after the pending revision, without duplicating it, estimating dates from wait durations', () => {
    const planned = mapUpcomingRunSteps(active, plan, Date.parse(entered));
    expect(planned.cards.map(({ id }) => id)).toEqual(['planned:next-wait', 'planned:email']);
    expect(planned.cards[0]).toMatchObject({
      state: 'planned',
      title: 'Wait 2 days',
      statusLabel: 'Not reached',
    });
    expect(planned.cards.map((card) => card.timestamp)).toEqual([
      { label: 'est.', value: '2026-09-15T12:00:00.000Z', estimated: true },
      { label: 'est.', value: '2026-09-15T12:00:00.000Z', estimated: true },
    ]);
    const cards = mapRunHistory(active, planned.cards);
    expect(cards.map(({ title }) => title)).toEqual([
      'Entered automation',
      'Waiting 3 days',
      'Wait 2 days',
      'Send email',
      'End of automation',
    ]);
    expect(cards[1].timestamp?.value).toBe(eligible);
  });

  it('keeps the visible path but suppresses estimates when the member is missing', () => {
    const result = mapUpcomingRunSteps({ ...active, member: null }, plan);
    expect(result.cards).toHaveLength(2);
    expect(result.cards.every((card) => !card.timestamp)).toBe(true);
  });

  it('returns no upcoming cards at the end of the saved workflow', () => {
    const result = mapUpcomingRunSteps(active, { ...plan, edges: [] });
    expect(result.cards).toEqual([]);
    expect(result.message).toBe('');
  });

  it('starts overdue schedules from now and accumulates each downstream wait', () => {
    const now = Date.parse('2026-09-20T12:00:00.000Z');
    const extended: AutomationRunPlan = {
      ...plan,
      edges: [...plan.edges, { source_action_id: 'email', target_action_id: 'disconnected' }],
    };
    expect(
      mapUpcomingRunSteps(active, extended, now).cards.map((card) => card.timestamp?.value),
    ).toEqual(['2026-09-22T12:00:00.000Z', '2026-09-22T12:00:00.000Z', '2026-10-02T12:00:00.000Z']);
  });

  it.each([null, 0, -1, Number.MAX_VALUE])(
    'omits downstream estimates after an unknown or unrepresentable duration %s',
    (waitHours) => {
      const invalid: AutomationRunPlan = {
        ...plan,
        actions: plan.actions.map((action) =>
          action.id === 'next-wait'
            ? { id: action.id, type: 'wait', data: { wait_hours: waitHours } }
            : action,
        ),
      };
      expect(
        mapUpcomingRunSteps(active, invalid, Date.parse(entered)).cards.every(
          (card) => !card.timestamp,
        ),
      ).toBe(true);
    },
  );

  it.each(['completed', 'exited_early', 'unclassified'] as const)(
    'does not append plans to %s runs',
    (status) => {
      expect(mapUpcomingRunSteps({ ...active, status }, plan)).toEqual({ cards: [], message: '' });
    },
  );

  it('does not suggest more execution for an inactive automation', () => {
    expect(mapUpcomingRunSteps(active, { ...plan, status: 'inactive' })).toEqual({
      cards: [],
      message: 'This automation is off. No further steps will run.',
    });
  });

  it.each([
    { id: 'different-automation' },
    { actions: plan.actions.filter((action) => action.id !== 'old-wait') },
    { actions: [...plan.actions, plan.actions[0]] },
    { edges: [...plan.edges, { source_action_id: 'email', target_action_id: 'old-wait' }] },
    { edges: [...plan.edges, { source_action_id: 'old-wait', target_action_id: 'email' }] },
    { edges: [...plan.edges, { source_action_id: 'email', target_action_id: 'missing' }] },
  ])('does not invent a complete path for an incompatible graph %j', (override) => {
    const result = mapUpcomingRunSteps(active, { ...plan, ...override });
    expect(result.cards).toEqual([]);
    expect(result.message).toContain('Upcoming steps are unavailable');
  });

  it.each([
    { steps: [] },
    { steps: [{ ...step, status: 'pending', action: null }] },
    {
      steps: [
        { ...step, status: 'pending' },
        { ...step, id: 'other', status: 'pending' },
      ],
    },
    {
      steps: [
        { ...step, status: 'pending' },
        { ...step, id: 'later', status: 'finished' },
      ],
    },
  ])('handles missing or ambiguous pending anchors %j', ({ steps }) => {
    const result = mapUpcomingRunSteps({ ...active, steps }, plan);
    expect(result.cards).toEqual([]);
    expect(result.message).toContain('Upcoming steps are unavailable');
  });
});
