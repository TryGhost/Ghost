import { describe, expect, it } from 'vitest';
import type { AutomationRunHistory } from '@tryghost/admin-x-framework/api/automation-run-history';
import { mapRunHistory } from './run-history';

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
const mapStep = (overrides: Partial<typeof step>) =>
  mapRunHistory({
    ...history,
    status: [
      'failed',
      'automation disabled',
      'member changed status',
      'member unsubscribed',
    ].includes(overrides.status ?? '')
      ? 'exited_early'
      : history.status,
    steps: [{ ...step, ...overrides }],
  })[1];

describe('recorded run history presentation', () => {
  it.each(['finished', 'pending', 'failed'])(
    'uses send and delivery evidence for a %s email step',
    (status) => {
      const emailStep = {
        ...step,
        status,
        finished_at: null,
        action: {
          id: 'email',
          type: 'send_email' as const,
          data: { email_subject: 'Welcome', email_lexical: '' },
        },
      };
      const sent = mapStep({ ...emailStep, email_sent_at: eligible });
      expect(sent).toMatchObject({
        title: 'Sent email',
        state: status === 'pending' ? 'pending' : 'occurred',
        timestamp: { label: 'Sent', value: eligible },
      });
      const delivered = mapStep({
        ...emailStep,
        email_sent_at: eligible,
        email_delivered_at: finished,
      });
      expect(delivered).toMatchObject({
        title: 'Received email',
        state: status === 'pending' ? 'pending' : 'occurred',
        timestamp: {
          label: 'Delivered',
          value: finished,
          related: { label: 'Sent', value: eligible },
        },
      });
      if (status === 'failed') {
        expect(delivered.statusLabel).toBe('Stopped');
        expect(delivered.details).toEqual([]);
      }
    },
  );

  it('keeps successful send evidence separate from the exit event', () => {
    const card = mapStep({
      status: 'failed',
      email_sent_at: eligible,
      action: { id: 'email', type: 'send_email', data: { email_subject: '', email_lexical: '' } },
    });
    expect(card).toMatchObject({
      state: 'occurred',
      statusLabel: 'Stopped',
      timestamp: { label: 'Sent', value: eligible },
      executionTimestamp: undefined,
    });
  });

  it('keeps an email pending when there is no send evidence, including older servers', () => {
    expect(
      mapStep({
        status: 'pending',
        action: { id: 'email', type: 'send_email', data: { email_subject: '', email_lexical: '' } },
      }),
    ).toMatchObject({
      title: 'Send email',
      state: 'pending',
      timestamp: { label: 'est.', value: eligible, estimated: true },
      details: [],
    });
  });
  it('uses entry and completion timestamps without fabricating a run-end timestamp', () => {
    const cards = mapRunHistory(history);
    expect(cards.map(({ kind }) => kind)).toEqual(['trigger', 'wait', 'end']);
    expect(cards[0]).toMatchObject({
      title: 'Entered automation',
      timestamp: { label: 'Entered', value: entered },
    });
    expect(cards[1]).toMatchObject({
      title: 'Waited 3 days',
      timestamp: { label: 'Completed', value: finished },
    });
    expect(cards[2]).toMatchObject({
      title: 'Completed',
      details: [],
    });
    expect(cards[2].timestamp).toBeUndefined();
    expect(JSON.stringify(cards)).not.toContain(updated);
  });

  it.each([eligible, entered])(
    'keeps pending eligibility %s distinct from completion even if it is in the past',
    (readyAt) => {
      const card = mapStep({ status: 'pending', ready_at: readyAt, finished_at: null });
      expect(card).toMatchObject({
        title: 'Waiting 3 days',
        state: 'pending',
        statusLabel: 'Pending',
        timestamp: { label: 'ends', value: readyAt, estimated: true },
      });
      expect(card.details).toEqual([]);
    },
  );

  it.each([
    ['failed', 'Failed'],
    ['automation disabled', 'Automation turned off'],
    ['member changed status', 'Member changed status'],
    ['member unsubscribed', 'Member unavailable or unsubscribed'],
  ])('preserves the recorded %s exit without inferring who caused it', (status) => {
    const card = mapStep({ status });
    expect(card).toMatchObject({
      title: 'Wait 3 days',
      state: 'exited',
      statusLabel: 'Stopped',
      timestamp: undefined,
    });
    expect(card.details).toEqual([]);
  });

  it.each(['finished', 'failed'])(
    'does not replace a missing %s timestamp with updated_at or ready_at',
    (status) => {
      const card = mapStep({ status, finished_at: null });
      expect(card.timestamp).toBeUndefined();
      expect(card.details).toEqual(status === 'finished' ? ['Completion time unavailable.'] : []);
      expect(JSON.stringify(card)).not.toContain(updated);
      expect(JSON.stringify(card)).not.toContain(eligible);
    },
  );

  it.each(['unexpected', 'constructor', ''])(
    'does not present unknown status %s as completed or an exit',
    (status) => {
      const card = mapStep({ status });
      expect(card).toMatchObject({
        state: 'unknown',
        statusLabel: 'Status unavailable',
        title: 'Wait 3 days',
      });
      expect(card.timestamp).toBeUndefined();
      expect(card.details).toEqual([`Recorded status: ${status || 'unavailable'}.`]);
    },
  );

  it.each([null, 0, -1])(
    'handles unavailable or invalid wait duration %s without making up a duration',
    (hours) => {
      const card = mapStep({ action: { id: 'wait', type: 'wait', data: { wait_hours: hours } } });
      expect(card.title).toBe('Wait');
      expect(card.details).toContain('Wait duration unavailable.');
    },
  );

  it.each([
    [24, '1 day'],
    [1, '1 hour'],
    [25, '25 hours'],
    [1.5, '1.5 hours'],
  ])('formats historical duration %s without rounding to days', (hours, duration) => {
    expect(
      mapStep({ action: { id: 'wait', type: 'wait', data: { wait_hours: Number(hours) } } }).title,
    ).toBe(`Waited ${duration}`);
  });

  it('keeps repeated actions, unavailable revisions and email steps in API order', () => {
    const cards = mapRunHistory({
      ...history,
      steps: [
        { ...step, id: 'z' },
        { ...step, id: 'missing', action: null },
        {
          ...step,
          id: 'email',
          action: {
            id: 'email-action',
            type: 'send_email',
            data: { email_subject: 'Not rendered yet', email_lexical: '' },
          },
        },
        { ...step, id: 'a' },
      ],
    });
    expect(cards.map(({ id }) => id)).toEqual([
      'entry:run',
      'step:z',
      'step:missing',
      'step:email',
      'step:a',
      'end:run',
    ]);
    expect(cards[2]).toMatchObject({
      title: 'Step details unavailable',
      state: 'occurred',
      timestamp: { value: finished },
    });
    expect(cards[3].kind).toBe('email');
  });

  it.each([
    ['in_progress', 'End of automation', 'planned'],
    ['exited_early', 'Exited early', 'exited'],
    ['unclassified', 'Outcome unavailable', 'unknown'],
  ] as const)(
    'uses the %s run outcome without adding an expected end date',
    (status, title, state) => {
      const end = mapRunHistory({ ...history, status }).at(-1)!;
      expect(end).toMatchObject({ title, state });
      expect(end.timestamp).toBeUndefined();
    },
  );

  it('keeps empty history unknown and does not infer future actions or an exit from a missing member', () => {
    const cards = mapRunHistory({
      ...history,
      status: 'unclassified',
      history_status: 'empty',
      steps: [],
    });
    expect(cards).toHaveLength(2);
    expect(cards[1]).toMatchObject({ title: 'Outcome unavailable', state: 'unknown' });
    expect(cards[1].details.join(' ')).not.toContain('unsubscribed');
  });

  it.each([
    ['failed', 'Wait step failed', 'failed'],
    ['automation disabled', 'Automation turned off', 'exited'],
    ['member changed status', 'Member changed subscription status', 'exited'],
    ['member unsubscribed', 'Member unavailable or unsubscribed', 'exited'],
  ])('places the recorded %s reason and stop time in one event card', (status, title, state) => {
    const cards = mapRunHistory({
      ...history,
      status: 'exited_early',
      steps: [{ ...step, status }],
    });
    expect(cards.map((card) => card.kind)).toEqual(['trigger', 'wait', 'event']);
    expect(cards[1].timestamp).toBeUndefined();
    expect(cards[2]).toMatchObject({
      title,
      state,
      details: [],
      timestamp: { label: 'Step stopped', value: finished },
    });
    const missingTime = mapRunHistory({
      ...history,
      status: 'exited_early',
      steps: [{ ...step, status, finished_at: null }],
    }).at(-1)!;
    expect(missingTime.timestamp).toBeUndefined();
  });

  it('does not claim a failed unsent email was sent or completed', () => {
    const cards = mapRunHistory({
      ...history,
      status: 'exited_early',
      failed: true,
      steps: [
        {
          ...step,
          status: 'failed',
          action: {
            id: 'email',
            type: 'send_email',
            data: { email_subject: 'Welcome', email_lexical: '' },
          },
        },
      ],
    });
    expect(cards[1]).toMatchObject({ title: 'Send email', state: 'exited', timestamp: undefined });
    expect(cards[2]).toMatchObject({ title: 'Email step failed', state: 'failed', kind: 'event' });
  });

  it.each([
    { steps: [] },
    {
      steps: [
        { ...step, status: 'failed' },
        { ...step, id: 'unknown', status: 'unexpected' },
      ],
    },
  ])('does not invent an exit reason from missing or ambiguous history', ({ steps }) => {
    const end = mapRunHistory({ ...history, status: 'exited_early', steps }).at(-1)!;
    if (steps.length > 1) {
      const previous = mapRunHistory({ ...history, status: 'exited_early', steps })[1];
      expect(previous.timestamp).toEqual({ label: 'Stopped', value: finished });
    }
    expect(end.title).toBe('Exited early');
    expect(end.details).toEqual([]);
    expect(end.timestamp).toBeUndefined();
  });
});
