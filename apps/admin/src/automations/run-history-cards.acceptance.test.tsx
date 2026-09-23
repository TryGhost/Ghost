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

  it('keeps history headings and timestamps separate beside the tablet sidebar', async () => {
    await page.viewport(768, 900);
    try {
      setup();
      respond(history('a'));
      await renderAdminApp('/automations/first', flags);
      await open();
      // Fixed-width editing cards need more room than the responsive history.
      await expect(editingCanvas()).toHaveCount(0);
      await select();
      await expect.element(card('Entered automation')).toBeVisible();
      for (const name of ['Entered automation', 'Waited 3 days']) {
        const element = card(name).element();
        const heading = element.querySelector('h3')!.getBoundingClientRect();
        const time = element.querySelector('time')!.getBoundingClientRect();
        expect(time.left >= heading.right || time.top >= heading.bottom).toBe(true);
        expect(element.scrollWidth).toBeLessThanOrEqual(element.clientWidth);
      }
    } finally {
      await page.viewport(1280, 800);
    }
  });

  it('switches between the full-width phone list and history without losing selection or drafts', async () => {
    await page.viewport(390, 844);
    try {
      setup();
      respond(history('a'));
      await renderAdminApp('/automations/first', flags);
      await editingCanvas().getByRole('textbox', { name: 'Wait for' }).fill('5');
      await open();
      await expect(editingCanvas()).toHaveCount(0);
      await select();
      await expect.element(canvas()).toBeVisible();
      await expect.element(page.getByRole('button', { name: 'Show performance' })).toBeVisible();
      expect(canvas().element().getBoundingClientRect().width).toBe(390);
      await open();
      await expect(canvas()).toHaveCount(0);
      await expect
        .element(page.getByRole('button', { name: /View run history for Alex,/ }))
        .toHaveAttribute('aria-pressed', 'true');
      await select();
      await expect.element(canvas().getByRole('button', { name: 'Back to editing' })).toHaveFocus();
      await close();
      await expect
        .element(editingCanvas().getByRole('textbox', { name: 'Wait for' }))
        .toHaveValue('5');
    } finally {
      await page.viewport(1280, 800);
    }
  });

  it('shows when the active wait ends without claiming it completed or predicting the run end', async () => {
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
    await expect.element(card('Waiting 3 days')).toHaveTextContent('ends ');
    await expect
      .element(card('Waiting 3 days'))
      .not.toHaveTextContent('not a guaranteed execution time');
    expect(card('Waiting 3 days').element().querySelector('time')?.dateTime).toBe(
      data.steps[0].ready_at,
    );
    const estimate = card('Waiting 3 days').element().querySelector('time')!;
    expect(estimate.textContent).toBe(
      `ends ${new Date(data.steps[0].ready_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`,
    );
    expect(estimate.title).toBe(
      `ends: ${new Date(data.steps[0].ready_at).toLocaleDateString(undefined, { dateStyle: 'full' })}`,
    );
    await expect.element(card('End of automation')).toBeVisible();
    expect(card('End of automation').element().querySelector('time')).toBeNull();
    await expect.element(canvas()).not.toHaveTextContent('Waited 3 days');
    await expect(canvas().getByRole('listitem')).toHaveCount(3);
  });

  it.each([
    ['failed', 'Wait step failed'],
    ['automation disabled', 'Automation turned off'],
    ['member changed status', 'Member changed subscription status'],
    ['member unsubscribed', 'Member unavailable or unsubscribed'],
  ])('shows the %s reason once in an event after the stopped step', async (status, label) => {
    setup();
    const data = history('a');
    data.status = 'exited_early';
    data.failed = status === 'failed';
    data.steps[0] = { ...data.steps[0], status, finished_at: finished, updated_at: updated };
    respond(data);
    await renderAdminApp('/automations/first', flags);
    await open();
    await select();
    await expect.element(card('Wait 3 days')).not.toHaveTextContent(label);
    expect(card('Wait 3 days').element().querySelector('time')).toBeNull();
    await expect.element(card(label)).toBeVisible();
    expect(card(label).element().querySelector('time')?.dateTime).toBe(finished);
    expect(card(label).element().querySelector('time')?.title).toContain('Step stopped:');
    expect(
      canvas()
        .getByRole('article')
        .elements()
        .map((item) => item.getAttribute('aria-label')),
    ).toEqual(['Entered automation', 'Wait 3 days', label]);
    await expect.element(canvas()).not.toHaveTextContent('publisher');
  });

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
