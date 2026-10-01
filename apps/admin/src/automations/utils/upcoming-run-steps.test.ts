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
  email_sent_at: null,
  email_delivered_at: null,
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

  it('follows saved edges after the pending action and marks the future path distinctly', () => {
    const upcoming = mapUpcomingRunSteps(active, plan);
    expect(upcoming.cards.map(({ id }) => id)).toEqual([
      'planned:next-wait',
      'planned:email',
      'end:run',
    ]);
    expect(upcoming.cards[0]).toMatchObject({
      state: 'planned',
      title: 'Wait 2 days',
      statusLabel: 'Not reached',
    });
    expect(upcoming.cards[1].email?.subject).toBe('Current saved email');
    expect(upcoming.cards.every((card) => !card.timestamp)).toBe(true);
    expect(mapRunHistory(active).at(-1)?.timestamp?.value).toBe(eligible);
  });

  it('shows only the end marker when the pending step is the final saved action', () => {
    expect(
      mapUpcomingRunSteps(active, { ...plan, edges: [] }).cards.map(({ title }) => title),
    ).toEqual(['End of automation']);
  });

  it('explains a pending action that was removed from the saved workflow', () => {
    const result = mapUpcomingRunSteps(active, {
      ...plan,
      actions: plan.actions.filter((action) => action.id !== 'old-wait'),
    });
    expect(result.cards).toEqual([]);
    expect(result.message).toContain('The queued step is no longer in the saved workflow');
  });

  it('does not suggest more execution for an inactive automation', () => {
    expect(mapUpcomingRunSteps(active, { ...plan, status: 'inactive' })).toEqual({
      cards: [],
      message: 'This automation is off. No further steps will run.',
    });
  });

  it.each(['completed', 'exited_early'] as const)('does not append plans to %s runs', (status) => {
    expect(mapUpcomingRunSteps({ ...active, status }, plan)).toEqual({ cards: [], message: '' });
  });
});
