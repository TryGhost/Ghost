import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { fakeAdminEndpoint, renderAdminApp } from '@test-utils/acceptance';
import type { AutomationDetail } from '@tryghost/admin-x-framework/api/automations';
import {
  flags,
  detail,
  history,
  setup,
  respond,
  canvas,
  select,
  open,
  close,
} from './run-history.test-utils';

describe('Run history preserves editor drafts', () => {
  it('contains history render errors and retries without remounting the editor', async () => {
    setup();
    respond({ ...history('a'), status: 'exited_early' });
    await renderAdminApp('/automations/first', flags);
    await page.getByRole('article', { name: 'Wait: 1 day' }).click();
    const input = page.getByRole('textbox', { name: 'Wait for' });
    await input.fill('5');
    await expect.element(input).toHaveValue('5');
    const originalInput = input.element();
    await open();
    await select();
    await expect
      .element(canvas().getByRole('alert'))
      .toHaveTextContent('Could not load run history');
    expect(originalInput.isConnected).toBe(true);

    const retried = respond(history('a'));
    await canvas().getByRole('button', { name: 'Retry', exact: true }).click();
    await expect.element(canvas()).toHaveTextContent('Waited 3 days');
    expect(retried.requests).toHaveLength(1);
    await close();
    expect(input.element()).toBe(originalInput);
    await expect.element(input).toHaveValue('5');
  });

  it('fetches fresh history when reopening a run without changing the draft', async () => {
    const { list, counts } = setup();
    const data = history('a');
    respond(data);
    await renderAdminApp('/automations/first', flags);
    await page.getByRole('article', { name: 'Wait: 1 day' }).click();
    await page.getByRole('textbox', { name: 'Wait for' }).fill('5');
    await open();
    await select();
    fakeAdminEndpoint('GET', '/automations/first/runs/a/', {
      automation_run_history: [{ ...data, member: { ...data.member!, name: 'Updated Alex' } }],
    });
    await close();
    await select();
    await expect
      .element(canvas().getByRole('button', { name: 'Back to editing' }))
      .toHaveTextContent('Alex');
    await expect
      .element(canvas().getByRole('button', { name: 'Back to editing' }))
      .toHaveTextContent('Updated Alex');
    expect(list.requests).toHaveLength(1);
    expect(counts.requests).toHaveLength(1);
    await close();
    await expect.element(page.getByRole('textbox', { name: 'Wait for' })).toHaveValue('5');
  });

  it('preserves the unsaved workflow and local inline field text, without saving', async () => {
    setup();
    respond(history('a'));
    const save = fakeAdminEndpoint('PUT', '/automations/first/', {
      automations: [detail('first')],
    });
    await renderAdminApp('/automations/first', flags);
    await page.getByRole('article', { name: 'Wait: 1 day' }).click();
    const input = page.getByRole('textbox', { name: 'Wait for' });
    await input.fill('3');
    await expect.element(page.getByRole('button', { name: 'Save', exact: true })).toBeEnabled();
    // Invalid field text lives in the input, outside the saved editor draft.
    await input.fill('0');
    await open();
    await select();
    await expect.element(canvas()).toHaveTextContent('Alex');
    await expect
      .element(document.querySelector<HTMLElement>('[aria-label="Editing canvas"]'))
      .not.toBeVisible();
    await expect.element(page.getByRole('button', { name: 'Save', exact: true })).toBeDisabled();
    await close();
    await expect.element(input).toHaveValue('0');
    await expect.element(page.getByRole('article', { name: 'Wait: 3 days' })).toBeVisible();
    await expect.element(page.getByRole('button', { name: 'Save', exact: true })).toBeEnabled();
    expect(save.requests).toHaveLength(0);
  });

  it('retains the unsaved-navigation guard while history is open', async () => {
    setup();
    respond(history('a'));
    await renderAdminApp('/automations/first', flags);
    await page.getByRole('article', { name: 'Wait: 1 day' }).click();
    await page.getByRole('textbox', { name: 'Wait for' }).fill('3');
    await open();
    await select();
    await expect.element(canvas()).toHaveTextContent('Alex');
    await page.getByRole('link', { name: 'Back to automations' }).click();
    await expect.element(page.getByRole('alertdialog')).toBeVisible();
    await page.getByRole('button', { name: 'Stay', exact: true }).click();
    await expect.element(canvas()).toHaveTextContent('Alex');
    await close();
    await expect.element(page.getByRole('article', { name: 'Wait: 3 days' })).toBeVisible();
  });

  it('restores the selected email settings and unsaved subject after leaving history', async () => {
    setup();
    const emailDetail: AutomationDetail = {
      ...detail('first'),
      actions: [
        {
          id: 'draft-email',
          type: 'send_email',
          data: {
            email_subject: 'Welcome',
            email_lexical: '',
            email_design_setting_id: 'design-1',
          },
        },
      ],
    };
    fakeAdminEndpoint('GET', '/automations/first/', { automations: [emailDetail] });
    const save = fakeAdminEndpoint('PUT', '/automations/first/', { automations: [emailDetail] });
    respond(history('a'));
    await renderAdminApp('/automations/first', flags);
    await page.getByRole('textbox', { name: 'Subject line' }).fill('Unsaved subject');
    await open();
    await select();
    await expect.element(canvas()).toHaveTextContent('Alex');
    await expect
      .element(page.getByRole('complementary', { name: 'Step details' }))
      .not.toBeInTheDocument();
    await close();
    await expect
      .element(page.getByRole('textbox', { name: 'Subject line' }))
      .toHaveValue('Unsaved subject');
    await expect
      .element(page.getByRole('article', { name: 'Send email: Unsaved subject' }))
      .toBeVisible();
    expect(save.requests).toHaveLength(0);
  });
});
