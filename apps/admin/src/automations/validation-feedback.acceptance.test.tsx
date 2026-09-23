import { describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { fakeAdminEndpoint, renderAdminApp } from '@test-utils/acceptance';
import type { AutomationDetail } from '@tryghost/admin-x-framework/api/automations';
import { detail, setup } from './run-history.test-utils';

const lexical = JSON.stringify({
  root: { children: [{ type: 'paragraph', children: [{ type: 'text', text: 'Welcome' }] }] },
});

const serve = (status: AutomationDetail['status'] = 'inactive', failSave = false) => {
  setup();
  const data: AutomationDetail = {
    ...detail('first'),
    status,
    actions: [
      {
        id: 'email',
        type: 'send_email',
        data: {
          email_subject: 'Welcome',
          email_lexical: lexical,
          email_design_setting_id: 'design',
        },
      },
      ...detail('first').actions,
    ],
    edges: [{ source_action_id: 'email', target_action_id: 'draft-wait' }],
  };
  fakeAdminEndpoint('GET', '/automations/first/', { automations: [data] });
  return fakeAdminEndpoint(
    'PUT',
    '/automations/first/',
    ({ body }) =>
      failSave
        ? { errors: [{ message: 'Something went wrong', type: 'InternalServerError' }] }
        : {
            automations: [
              { ...data, ...(body as { automations: Partial<AutomationDetail>[] }).automations[0] },
            ],
          },
    { status: failSave ? 500 : 200 },
  );
};

const boot = (enabled: boolean) =>
  renderAdminApp('/automations/first', {
    labs: { automations: true, automationRunAnalytics: enabled },
  });

const clearSubject = async (enabled: boolean) => {
  if (enabled) {
    await page.getByRole('textbox', { name: 'Subject line' }).fill('');
  } else {
    await page.getByRole('button', { name: 'Send email: Welcome' }).click();
    await page.getByPlaceholder('Subject line').fill('');
  }
};

describe('Automation action validation feedback', () => {
  for (const enabled of [false, true]) {
    for (const status of ['inactive', 'active'] as const) {
      it(
        (enabled ? 'shows a text popover' : 'keeps the error toast') +
          ' when ' +
          status +
          ' publishing is blocked',
        async () => {
          const save = serve(status);
          await boot(enabled);
          await clearSubject(enabled);
          const publish = page.getByRole('button', {
            name: status === 'active' ? 'Publish changes' : 'Publish',
            exact: true,
          });
          await publish.click();
          const message = page.getByText('Fix all issues to publish this automation.', {
            exact: true,
          });
          const toast = page.getByText('Automation needs a few details', { exact: true });
          if (enabled) {
            await expect.element(message).toBeVisible();
            await expect.element(toast).not.toBeInTheDocument();
            await expect
              .element(page.getByRole('button', { name: 'Why this step needs attention' }))
              .toBeVisible();
            await userEvent.keyboard('{Escape}');
            await expect.element(message).not.toBeInTheDocument();
            await expect.element(publish).toHaveFocus();
            await publish.click();
            await expect.element(message).toBeVisible();
            await page.getByRole('textbox', { name: 'Subject line' }).click();
            await page.getByRole('textbox', { name: 'Subject line' }).fill('Fixed');
            await expect
              .element(page.getByRole('textbox', { name: 'Subject line' }))
              .toHaveValue('Fixed');
            await expect.element(page.getByRole('textbox', { name: 'Subject line' })).toHaveFocus();
            await expect.element(message).not.toBeInTheDocument();
            await publish.click();
            await expect.element(page.getByRole('alertdialog')).toBeVisible();
            await page
              .getByRole('alertdialog')
              .getByRole('button', { name: 'Cancel', exact: true })
              .click();
            await expect.element(page.getByRole('alertdialog')).not.toBeInTheDocument();
            // The existing confirmation has no DialogTrigger and restores focus to body.
            // Wait for that cleanup before mounting the next test's editor.
            await expect.poll(() => document.activeElement === document.body).toBe(true);
          } else {
            await expect.element(toast).toBeVisible();
            await expect.element(message).not.toBeInTheDocument();
            await expect.element(page.getByRole('alertdialog')).not.toBeInTheDocument();
          }
          expect(save.requests).toHaveLength(0);
        },
      );
    }

    it(
      'keeps genuine save failures as toasts with the flag ' + (enabled ? 'on' : 'off'),
      async () => {
        serve('inactive', true);
        await boot(enabled);
        if (enabled) {
          await page.getByRole('textbox', { name: 'Subject line' }).fill('Updated');
        } else {
          await page.getByRole('button', { name: 'Send email: Welcome' }).click();
          await page.getByPlaceholder('Subject line').fill('Updated');
        }
        await page.getByRole('button', { name: 'Save', exact: true }).click();
        await expect
          .element(page.getByText('Automation couldn’t be saved', { exact: true }))
          .toBeVisible();
        await expect
          .element(page.getByText('Fix all issues to save this automation.', { exact: true }))
          .not.toBeInTheDocument();
      },
    );
  }

  it('anchors invalid wait feedback to Save and leaves the typed value alone', async () => {
    const save = serve();
    await boot(true);
    const wait = page.getByRole('textbox', { name: 'Wait for' });
    await wait.fill('0');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    const message = page.getByText('Fix all issues to save this automation.', { exact: true });
    await expect.element(message).toBeVisible();
    await expect
      .element(page.getByText('Automation needs a few details', { exact: true }))
      .not.toBeInTheDocument();
    await expect.element(wait).toHaveValue('0');
    expect(save.requests).toHaveLength(0);
    await wait.click();
    await wait.fill('2');
    await expect.element(wait).toHaveValue('2');
    await expect.element(wait).toHaveFocus();
    await expect.element(message).not.toBeInTheDocument();
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect.poll(() => save.requests.length).toBe(1);
  });

  it('still permits saving incomplete inactive emails', async () => {
    const save = serve();
    await boot(true);
    await clearSubject(true);
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect.poll(() => save.requests.length).toBe(1);
    await expect
      .element(page.getByText('Fix all issues to save this automation.', { exact: true }))
      .not.toBeInTheDocument();
  });
});
