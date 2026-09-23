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
  const savedPlan = (): AutomationDetail => ({
    ...detail('first'),
    status: 'active',
    actions: [
      ...detail('first').actions,
      { id: 'future-wait', type: 'wait', data: { wait_hours: 48 } },
      {
        id: 'future-email',
        type: 'send_email',
        data: {
          email_subject: 'Saved future subject',
          email_lexical: '',
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
    await page
      .getByRole('article', { name: 'Send email: Saved future subject' })
      .getByRole('button', { name: 'Email actions' })
      .click();
    await page.getByRole('menuitem', { name: 'Edit settings' }).click();
    await page.getByPlaceholder('Subject line').fill('Unsaved future subject');
    await open();
    expect(request.requests).toHaveLength(1);
    await select();
    await expect
      .element(canvas().getByRole('group', { name: 'Upcoming email subject' }))
      .toHaveTextContent('Saved future subject');
    await expect.element(canvas()).not.toHaveTextContent('Unsaved future subject');
    const cards = canvas().getByRole('article');
    expect(cards.elements().map((card) => card.getAttribute('aria-label'))).toEqual([
      'Entered automation',
      'Waiting 3 days',
      'Wait 2 days',
      'Send email',
      'End of automation',
    ]);
    await expect.element(cards.nth(2)).toHaveTextContent('Not reached');
    expect(cards.nth(2).element().querySelector('time')?.getAttribute('aria-label')).toContain(
      'Estimated date:',
    );
    for (const card of [cards.nth(2), cards.nth(3)]) {
      const time = card.element().querySelector('time')!;
      expect(time.textContent).toBe(
        `est. ${new Date(time.dateTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`,
      );
      expect(time.title).toBe(
        `Estimated date: ${new Date(time.dateTime).toLocaleDateString(undefined, { dateStyle: 'full' })}`,
      );
    }
    expect(cards.nth(3).element().querySelector('time')?.dateTime).toBe(
      cards.nth(2).element().querySelector('time')?.dateTime,
    );
    await expect.element(canvas()).not.toHaveTextContent('Upcoming steps follow');
    expect(request.requests).toHaveLength(2);
    await close();
    await expect
      .element(page.getByPlaceholder('Subject line'))
      .toHaveValue('Unsaved future subject');
  });

  it('keeps upcoming steps without dates when the member is missing', async () => {
    setup();
    fakeAdminEndpoint('GET', '/automations/first/', { automations: [savedPlan()] });
    respond({ ...activeHistory(), member: null });
    await renderAdminApp('/automations/first', flags);
    await open();
    await select();
    await expect.element(canvas().getByRole('article', { name: 'Wait 2 days' })).toBeVisible();
    expect(
      canvas().getByRole('article', { name: 'Wait 2 days' }).element().querySelector('time'),
    ).toBeNull();
    expect(
      canvas().getByRole('article', { name: 'Send email' }).element().querySelector('time'),
    ).toBeNull();
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
    await expect.element(canvas()).toHaveTextContent('Could not load run history.');
    let finish!: () => void;
    const pending = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const changed = savedPlan();
    changed.actions[2] = {
      ...changed.actions[2],
      type: 'send_email',
      data: { email_subject: 'Updated path', email_lexical: '', email_design_setting_id: 'design' },
    };
    fakeAdminEndpoint('GET', '/automations/first/', async () => {
      await pending;
      return { automations: [changed] };
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

  it.each([500, 404])(
    'shows the shared error and retries after the saved workflow returns %s',
    async (status) => {
      setup();
      respond(activeHistory());
      await renderAdminApp('/automations/first', flags);
      await open();
      fakeAdminEndpoint(
        'GET',
        '/automations/first/',
        { errors: [{ message: 'Unavailable' }] },
        { status },
      );
      await select();
      await expect
        .element(canvas().getByRole('alert'))
        .toHaveTextContent('Could not load run history.');
      await expect(canvas().getByRole('article')).toHaveCount(0);
      fakeAdminEndpoint('GET', '/automations/first/', { automations: [savedPlan()] });
      await canvas().getByRole('button', { name: 'Retry' }).click();
      await expect.element(canvas()).toHaveTextContent('Saved future subject');
    },
  );

  it.each(['wrong automation', 'invalid graph payload'])(
    'shows the shared error for %s',
    async (scenario) => {
      setup();
      respond(activeHistory());
      await renderAdminApp('/automations/first', flags);
      await open();
      const plan =
        scenario === 'wrong automation'
          ? { ...savedPlan(), id: 'other' }
          : { ...savedPlan(), actions: null };
      fakeAdminEndpoint('GET', '/automations/first/', { automations: [plan] });
      await select();
      await expect
        .element(canvas().getByRole('alert'))
        .toHaveTextContent('Could not load run history.');
      await expect(canvas().getByRole('article')).toHaveCount(0);
    },
  );

  it('explains a removed pending action instead of showing unrelated future steps', async () => {
    setup();
    const data = activeHistory();
    data.steps[0].action!.id = 'removed';
    respond(data);
    fakeAdminEndpoint('GET', '/automations/first/', { automations: [savedPlan()] });
    await renderAdminApp('/automations/first', flags);
    await open();
    await select();
    await expect
      .element(canvas())
      .toHaveTextContent('The queued step is no longer in the saved workflow.');
    await expect(canvas().getByRole('article')).toHaveCount(3);
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
    const oldPlan = savedPlan();
    const email = oldPlan.actions.find((action) => action.type === 'send_email')!;
    if (email.type === 'send_email') {
      email.data.email_subject = 'Stale future subject';
    }
    const oldRequest = fakeAdminEndpoint('GET', '/automations/first/', async () => {
      await pending;
      return { automations: [oldPlan] };
    });
    await select();
    await expect.element(canvas()).toHaveTextContent('Loading run history');
    await expect.poll(() => oldRequest.requests.length).toBe(1);
    fakeAdminEndpoint('GET', '/automations/first/', { automations: [savedPlan()] });
    await select('Bea');
    await expect.element(canvas()).toHaveTextContent('Saved future subject');
    await select();
    await expect.element(canvas()).toHaveTextContent('Saved future subject');
    finish();
    await settleRequests();
    await expect.element(canvas()).not.toHaveTextContent('Stale future subject');
    await expect.element(canvas()).toHaveTextContent('Saved future subject');
  });
});
