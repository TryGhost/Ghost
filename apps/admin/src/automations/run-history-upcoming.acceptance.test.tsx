import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { fakeAdminEndpoint, renderAdminApp } from '@test-utils/acceptance';
import { settleRequests } from '@test-utils/acceptance/worker';
import type { AutomationDetail } from '@tryghost/admin-x-framework/api/automations';
import {
  flags,
  history,
  detail,
  setup,
  respond,
  canvas,
  select,
  open,
  close,
} from './run-history.test-utils';

describe('Upcoming steps in active run history', () => {
  const activeHistory = (id = 'a', name = 'Alex') => {
    const data = history(id, name);
    data.status = 'in_progress';
    data.steps[0].status = 'pending';
    data.steps[0].finished_at = null;
    data.steps[0].action = { id: 'draft-wait', type: 'wait', data: { wait_hours: 72 } };
    return data;
  };
  const savedPlan = ({
    subject = 'Saved future subject',
    lexical = '',
  } = {}): AutomationDetail => ({
    ...detail('first'),
    status: 'active',
    actions: [
      ...detail('first').actions,
      { id: 'future-wait', type: 'wait', data: { wait_hours: 48 } },
      {
        id: 'future-email',
        type: 'send_email',
        data: {
          email_subject: subject,
          email_lexical: lexical,
          email_design_setting_id: 'design',
        },
      },
    ],
    edges: [
      { source_action_id: 'draft-wait', target_action_id: 'future-wait' },
      { source_action_id: 'future-wait', target_action_id: 'future-email' },
    ],
  });

  it('shows the saved downstream path while preserving the unsaved draft', async () => {
    setup();
    const request = fakeAdminEndpoint('GET', '/automations/first/', { automations: [savedPlan()] });
    respond(activeHistory());
    await renderAdminApp('/automations/first', flags);
    await page.getByRole('textbox', { name: 'Subject line' }).fill('Unsaved future subject');
    await open();
    expect(request.requests).toHaveLength(1);
    await select();
    await expect
      .element(canvas().getByRole('group', { name: 'Upcoming email subject' }))
      .toHaveTextContent('Saved future subject');
    await expect.element(canvas()).not.toHaveTextContent('Unsaved future subject');
    const cards = canvas().getByRole('article');
    expect(cards.elements().map((card) => card.getAttribute('aria-label'))).toEqual([
      'Signed up',
      'Waiting 3 days',
      'Wait 2 days',
      'Send email',
      'Completed',
    ]);
    await expect.element(cards.nth(2)).toHaveTextContent('Not reached');
    const waitTimes = cards.nth(2).element().querySelectorAll('time');
    expect(waitTimes).toHaveLength(2);
    const [start, end] = [...waitTimes].map((time) => new Date(time.dateTime));
    const shortDate = { month: 'short', day: 'numeric' } as const;
    const fullDate = { dateStyle: 'full' } as const;
    await expect
      .element(cards.nth(2))
      .toHaveTextContent(
        `est. ${start.toLocaleDateString(undefined, shortDate)}–${end.toLocaleDateString(undefined, shortDate)}`,
      );
    expect(end.getTime() - start.getTime()).toBe(48 * 60 * 60 * 1000);
    expect(waitTimes[0].parentElement?.title).toBe(
      `Estimated dates: ${start.toLocaleDateString(undefined, fullDate)}–${end.toLocaleDateString(undefined, fullDate)}`,
    );
    const emailTime = cards.nth(3).element().querySelector('time')!;
    expect(emailTime.textContent).toBe(`est. ${end.toLocaleDateString(undefined, shortDate)}`);
    expect(emailTime.title).toBe(`Estimated date: ${end.toLocaleDateString(undefined, fullDate)}`);
    expect(emailTime.dateTime).toBe(waitTimes[1].dateTime);
    expect(cards.nth(4).element().querySelector('time')).toBeNull();
    expect(request.requests).toHaveLength(2);
    await close();
    await expect
      .element(page.getByRole('textbox', { name: 'Subject line' }))
      .toHaveValue('Unsaved future subject');
  });

  it('retries history and its saved path together, showing loading until both settle', async () => {
    setup();
    fakeAdminEndpoint('GET', '/automations/first/', { automations: [savedPlan()] });
    respond(activeHistory());
    await renderAdminApp('/automations/first', flags);
    await open();
    fakeAdminEndpoint(
      'GET',
      '/automations/first/',
      { errors: [{ message: 'Unavailable' }] },
      { status: 500 },
    );
    await select();
    await expect.element(canvas()).toHaveTextContent('Could not load run history');
    await expect(canvas().getByRole('article')).toHaveCount(0);
    let finish!: () => void;
    const pending = new Promise<void>((resolve) => {
      finish = resolve;
    });
    fakeAdminEndpoint('GET', '/automations/first/', async () => {
      await pending;
      return { automations: [savedPlan({ subject: 'Updated path' })] };
    });
    respond({
      ...activeHistory(),
      member: { id: 'same-member', name: 'Updated member', email: 'alex@example.com' },
    });
    try {
      await canvas().getByRole('button', { name: 'Retry' }).click();
      await expect(canvas().getByRole('article')).toHaveCount(0);
      await expect
        .element(canvas().getByRole('status', { name: 'Loading run history' }))
        .toBeVisible();
    } finally {
      finish();
    }
    await expect.element(canvas()).toHaveTextContent('Updated path');
    await expect.element(canvas()).toHaveTextContent('Updated member');
  });

  it('ends after a removed pending action without showing unrelated future steps', async () => {
    setup();
    const data = activeHistory();
    data.steps[0].action.id = 'removed';
    respond(data);
    fakeAdminEndpoint('GET', '/automations/first/', { automations: [savedPlan()] });
    await renderAdminApp('/automations/first', flags);
    await open();
    await select();
    await expect.element(canvas()).toHaveTextContent('Completed');
    expect(
      canvas()
        .getByRole('article')
        .elements()
        .map((card) => card.getAttribute('aria-label')),
    ).toEqual(['Signed up', 'Waiting 3 days', 'Completed']);
  });

  it('retries an upcoming email mapping error without losing the editor draft', async () => {
    setup();
    fakeAdminEndpoint('GET', '/automations/first/', { automations: [savedPlan()] });
    const historyRequest = respond(activeHistory());
    await renderAdminApp('/automations/first', flags);
    const subject = page.getByRole('textbox', { name: 'Subject line' });
    await subject.fill('Unsaved future subject');
    const originalInput = subject.element();
    fakeAdminEndpoint('GET', '/automations/first/', {
      automations: [savedPlan({ lexical: '{' })],
    });
    await open();
    await select();
    await expect
      .element(canvas().getByRole('alert'))
      .toHaveTextContent('Could not load run history');
    expect(originalInput.isConnected).toBe(true);
    await expect(canvas().getByRole('button')).toHaveCount(1);
    await expect.element(canvas().getByRole('button', { name: 'Retry' })).toBeVisible();

    const planRequest = fakeAdminEndpoint('GET', '/automations/first/', {
      automations: [savedPlan()],
    });
    await canvas().getByRole('button', { name: 'Retry' }).click();
    await expect.element(canvas()).toHaveTextContent('Completed');
    expect(historyRequest.requests).toHaveLength(2);
    expect(planRequest.requests).toHaveLength(1);
    await close();
    expect(subject.element()).toBe(originalInput);
    await expect.element(subject).toHaveValue('Unsaved future subject');
  });

  it('ignores a late plan from an earlier selection, including A to B to A', async () => {
    setup();
    respond(activeHistory());
    respond(activeHistory('b', 'Bea'));
    await renderAdminApp('/automations/first', flags);
    await open();
    let finish!: () => void;
    const pending = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const oldRequest = fakeAdminEndpoint('GET', '/automations/first/', async () => {
      await pending;
      return { automations: [savedPlan({ subject: 'Stale future subject' })] };
    });
    try {
      await select();
      await expect
        .element(canvas().getByRole('status', { name: 'Loading run history' }))
        .toBeVisible();
      await expect.poll(() => oldRequest.requests.length).toBe(1);
      fakeAdminEndpoint('GET', '/automations/first/', { automations: [savedPlan()] });
      await select('Bea');
      await expect.element(canvas()).toHaveTextContent('Saved future subject');
      await select();
      await expect.element(canvas()).toHaveTextContent('Saved future subject');
    } finally {
      finish();
    }
    await settleRequests();
    await expect.element(canvas()).not.toHaveTextContent('Stale future subject');
    await expect.element(canvas()).toHaveTextContent('Saved future subject');
  });
});
