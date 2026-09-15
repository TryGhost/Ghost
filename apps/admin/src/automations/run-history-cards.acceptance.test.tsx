import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { renderAdminApp } from '@test-utils/acceptance';
import {
  flags,
  history,
  setup,
  respond,
  canvas,
  editingCanvas,
  select,
  open,
  close,
} from './run-history.test-utils';

describe('Recorded trigger, wait, and outcome cards', () => {
  const card = (name: string) => canvas().getByRole('article', { name, exact: true });
  const entered = '2026-09-10T12:00:00.000Z';
  const finished = '2026-09-13T12:00:04.000Z';
  const updated = '2026-09-15T12:00:00.000Z';

  it('shows the historical wait duration, recorded times, and connections without editing controls', async () => {
    setup();
    const data = history('a');
    data.created_at = entered;
    data.steps[0].finished_at = finished;
    data.steps[0].updated_at = updated;
    respond(data);
    await renderAdminApp('/automations/first', flags);
    await open();
    await select();
    await expect.element(card('Waited 3 days')).toBeVisible();
    const flow = canvas().getByRole('list', { name: 'Run history and upcoming steps' });
    await expect(flow.getByRole('listitem')).toHaveCount(3);
    expect(card('Entered automation').element().querySelector('time')?.dateTime).toBe(entered);
    expect(card('Waited 3 days').element().querySelector('time')?.dateTime).toBe(finished);
    expect(card('Completed').element().querySelector('time')).toBeNull();
    await expect.element(card('Completed')).not.toHaveTextContent('End time unavailable.');
    await expect(flow.getByRole('button')).toHaveCount(0);
    await expect(flow.getByRole('textbox')).toHaveCount(0);
    // Connections occupy the gap between consecutive recorded cards, rather
    // than overlaying card content or depending on the editing graph.
    const items = Array.from(flow.element().children);
    for (let index = 1; index < items.length; index++) {
      const connector = items[index].firstElementChild!;
      const rect = connector.getBoundingClientRect();
      const previous = items[index - 1].querySelector('[role="article"]')!.getBoundingClientRect();
      const next = items[index].querySelector('[role="article"]')!.getBoundingClientRect();
      expect(connector.getAttribute('aria-hidden')).toBe('true');
      expect(rect.top).toBeCloseTo(previous.bottom, 0);
      expect(rect.bottom).toBeCloseTo(next.top, 0);
      expect(rect.left + rect.width / 2).toBeCloseTo(next.left + next.width / 2, 0);
    }
    await page.getByRole('button', { name: 'Hide performance' }).click();
    await expect.element(card('Waited 3 days')).toBeVisible();
  });

  it('retains the canvas scroll position while refreshing recorded cards', async () => {
    setup();
    const data = history('a');
    data.steps = Array.from({ length: 12 }, (_, index) => ({
      ...data.steps[0],
      id: `step-${index}`,
    }));
    respond(data);
    await renderAdminApp('/automations/first', flags);
    await open();
    await select();
    await expect.element(card('Completed')).toBeInTheDocument();
    canvas().element().scrollTop = 200;
    expect(canvas().element().scrollTop).toBe(200);
    respond({ ...data, member: { ...data.member!, name: 'Updated Alex' } });
    await canvas().getByRole('button', { name: 'Refresh run history' }).click();
    await expect.element(canvas()).toHaveTextContent('Updated Alex');
    expect(canvas().element().scrollTop).toBe(200);
  });

  it('shows the pending resume time without claiming a completed wait or predicting an end', async () => {
    setup();
    const data = history('a');
    data.status = 'in_progress';
    data.steps[0] = {
      ...data.steps[0],
      status: 'pending',
      finished_at: null,
      ready_at: '2026-09-20T12:00:00.000Z',
    };
    respond(data);
    await renderAdminApp('/automations/first', flags);
    await open();
    await select();
    await expect.element(card('Waiting 3 days')).toHaveTextContent('Resumes');
    await expect
      .element(card('Waiting 3 days'))
      .not.toHaveTextContent('not a guaranteed execution time');
    expect(card('Waiting 3 days').element().querySelector('time')?.dateTime).toBe(
      data.steps[0].ready_at,
    );
    await expect.element(card('End of automation')).toBeVisible();
    expect(card('End of automation').element().querySelector('time')).toBeNull();
    await expect.element(canvas()).not.toHaveTextContent('Waited 3 days');
    await expect(canvas().getByRole('listitem')).toHaveCount(3);
  });

  it.each([
    ['failed', 'Failed'],
    ['member unsubscribed', 'Member unsubscribed'],
  ])(
    'shows the recorded %s reason at the stopped step, without assigning its time to the run end',
    async (status, label) => {
      setup();
      const data = history('a');
      data.status = 'exited_early';
      data.failed = status === 'failed';
      data.steps[0] = { ...data.steps[0], status, finished_at: finished, updated_at: updated };
      respond(data);
      await renderAdminApp('/automations/first', flags);
      await open();
      await select();
      await expect.element(card('Wait 3 days')).toHaveTextContent(label);
      expect(card('Wait 3 days').element().querySelector('time')?.dateTime).toBe(finished);
      await expect.element(card('Exited early')).not.toHaveTextContent('End time unavailable.');
      expect(card('Exited early').element().querySelector('time')).toBeNull();
      await expect.element(canvas()).not.toHaveTextContent('publisher');
    },
  );

  it('retains gaps and email positions in incomplete history, with a scrollable canvas and persistent close control', async () => {
    setup();
    const data = history('a');
    data.status = 'unclassified';
    data.history_status = 'partial';
    data.steps = [
      { ...data.steps[0], finished_at: null },
      { ...data.steps[0], id: 'missing', status: 'unrecognized', action: null },
      {
        ...data.steps[0],
        id: 'email',
        action: {
          id: 'old-email',
          type: 'send_email',
          data: { email_subject: 'Deferred email subject', email_lexical: '' },
        },
      },
    ];
    respond(data);
    await renderAdminApp('/automations/first', flags);
    await open();
    await select();
    await expect.element(card('Waited 3 days')).toHaveTextContent('Completion time unavailable.');
    expect(card('Waited 3 days').element().querySelector('time')).toBeNull();
    await expect
      .element(card('Step details unavailable'))
      .toHaveTextContent('Recorded status: unrecognized.');
    const flow = canvas().getByRole('list', { name: 'Run history and upcoming steps' });
    expect(
      Array.from(flow.element().querySelectorAll('h3')).map((heading) => heading.textContent),
    ).toEqual([
      'Entered automation',
      'Waited 3 days',
      'Step details unavailable',
      'Sent email',
      'Outcome unavailable',
    ]);
    card('Outcome unavailable').element().scrollIntoView();
    await expect.element(card('Outcome unavailable')).toBeVisible();
    await expect.element(canvas().getByRole('button', { name: 'Back to editing' })).toBeVisible();
    await expect.poll(() => canvas().element().scrollTop).toBeGreaterThan(0);
    await close();
    await expect.element(editingCanvas()).toBeVisible();
  });
});
