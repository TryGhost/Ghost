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
  mapRunHistory({ ...history, steps: [{ ...step, ...overrides }] })[1];

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
        state: status === 'finished' ? 'occurred' : status === 'pending' ? 'pending' : 'exited',
        timestamp: { label: 'Sent', value: eligible },
      });
      const delivered = mapStep({
        ...emailStep,
        email_sent_at: eligible,
        email_delivered_at: finished,
      });
      expect(delivered).toMatchObject({
        title: 'Received email',
        state: status === 'finished' ? 'occurred' : status === 'pending' ? 'pending' : 'exited',
        timestamp: {
          label: 'Delivered',
          value: finished,
          related: { label: 'Sent', value: eligible },
        },
      });
      if (status === 'failed') {
        expect(delivered.statusLabel).toBe('Failed');
        expect(delivered.details).toContain('Stop time unavailable.');
      }
    },
  );

  it('keeps the execution failure and stop time alongside a successful email send', () => {
    const card = mapStep({
      status: 'failed',
      email_sent_at: eligible,
      action: { id: 'email', type: 'send_email', data: { email_subject: '', email_lexical: '' } },
    });
    expect(card).toMatchObject({
      state: 'exited',
      statusLabel: 'Failed',
      timestamp: { label: 'Sent', value: eligible },
      executionTimestamp: { label: 'Stopped', value: finished },
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
      timestamp: { label: 'Scheduled', value: eligible },
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
        timestamp: { label: 'Resumes', value: readyAt },
      });
      expect(card.details).toEqual([]);
    },
  );

  it.each([
    ['failed', 'Failed'],
    ['automation disabled', 'Automation disabled'],
    ['member changed status', 'Member changed status'],
    ['member unsubscribed', 'Member unsubscribed'],
  ])('preserves the recorded %s exit without inferring who caused it', (status, label) => {
    const card = mapStep({ status });
    expect(card).toMatchObject({
      title: 'Wait 3 days',
      state: 'exited',
      statusLabel: label,
      timestamp: { label: 'Stopped', value: finished },
    });
    expect(card.details).toEqual([]);
  });

  it.each(['finished', 'failed'])(
    'does not replace a missing %s timestamp with updated_at or ready_at',
    (status) => {
      const card = mapStep({ status, finished_at: null });
      expect(card.timestamp).toBeUndefined();
      expect(card.details.join(' ')).toContain('time unavailable');
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
});
