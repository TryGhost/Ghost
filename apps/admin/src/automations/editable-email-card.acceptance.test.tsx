import { describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { fakeAdminEndpoint, renderAdminApp } from '@test-utils/acceptance';
import type { AutomationDetail } from '@tryghost/admin-x-framework/api/automations';
import {
  detail,
  flags,
  setup,
  history,
  respond,
  open,
  select,
  close,
} from './run-history.test-utils';

const lexical = (text: string) =>
  JSON.stringify({
    root: {
      type: 'root',
      version: 1,
      direction: null,
      format: '',
      indent: 0,
      children: [
        {
          type: 'paragraph',
          version: 1,
          direction: null,
          format: '',
          indent: 0,
          children: [
            {
              type: 'extended-text',
              version: 1,
              detail: 0,
              format: 0,
              mode: 'normal',
              style: '',
              text,
            },
          ],
        },
      ],
    },
  });
const workflow = (): AutomationDetail => ({
  ...detail('first'),
  actions: [
    {
      id: 'first-email',
      type: 'send_email',
      data: {
        email_subject: 'Welcome',
        email_lexical: lexical('Thanks for joining.'),
        email_design_setting_id: 'design',
      },
    },
    { id: 'wait', type: 'wait', data: { wait_hours: 24 } },
    {
      id: 'second-email',
      type: 'send_email',
      data: { email_subject: '', email_lexical: '', email_design_setting_id: 'design' },
    },
  ],
  edges: [
    { source_action_id: 'first-email', target_action_id: 'wait' },
    { source_action_id: 'wait', target_action_id: 'second-email' },
  ],
});
const emailCards = () =>
  page
    .getByRole('region', { name: 'Editing canvas' })
    .getByRole('article', { name: /^Send email/ });
const serve = () => {
  setup();
  const data = workflow();
  fakeAdminEndpoint('GET', '/automations/first/', { automations: [data] });
  return fakeAdminEndpoint('PUT', '/automations/first/', ({ body }) => ({
    automations: [
      { ...data, ...(body as { automations: Partial<AutomationDetail>[] }).automations[0] },
    ],
  }));
};

describe('Editable email cards', () => {
  it('keeps the existing editor when run analytics is off', async () => {
    serve();
    await renderAdminApp('/automations/first', { labs: { automations: true } });
    await expect.element(page.getByRole('button', { name: 'Send email: Welcome' })).toBeVisible();
    await expect(emailCards()).toHaveCount(0);
    await page.getByRole('button', { name: 'Send email: Welcome' }).click();
    await expect.element(page.getByPlaceholder('Subject line')).toHaveValue('Welcome');
  });

  it('uses the three-dot menu instead of right-click actions', async () => {
    const save = serve();
    await renderAdminApp('/automations/first', flags);
    await emailCards()
      .nth(0)
      .getByRole('heading', { name: 'Send email' })
      .click({ button: 'right' });
    await expect.element(page.getByRole('menu')).not.toBeInTheDocument();
    await emailCards().nth(0).getByRole('button', { name: 'Email actions' }).click();
    await expect.element(page.getByRole('menuitem', { name: 'Delete' })).toBeVisible();
    await page.getByRole('menuitem', { name: 'Edit settings' }).click();
    await expect.element(page.getByPlaceholder('Subject line')).toHaveValue('Welcome');
    // Let the menu finish unmounting and restoring focus before the next app mounts.
    await expect
      .poll(() => document.querySelector('[data-slot="dropdown-menu-content"]'))
      .toBeNull();
    await page.getByPlaceholder('Subject line').click();
    await expect.element(page.getByPlaceholder('Subject line')).toHaveFocus();
    expect(save.requests).toHaveLength(0);
  });

  it('keeps separate inline drafts and saves through the existing automation Save action', async () => {
    const save = serve();
    await renderAdminApp('/automations/first', flags);
    const first = emailCards().nth(0).getByRole('textbox', { name: 'Subject line' });
    await first.click();
    await first.fill('Updated welcome');
    await expect.element(first).toHaveFocus();
    await emailCards().nth(1).getByRole('textbox', { name: 'Subject line' }).fill('Follow up');
    await expect.element(first).toHaveValue('Updated welcome');
    expect(save.requests).toHaveLength(0);
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect.poll(() => save.requests.length).toBe(1);
    const saved = (save.requests[0].body as { automations: AutomationDetail[] }).automations[0];
    expect(saved.actions[0].data).toMatchObject({
      email_subject: 'Updated welcome',
      email_lexical: lexical('Thanks for joining.'),
    });
    expect(saved.actions[2].data).toMatchObject({ email_subject: 'Follow up', email_lexical: '' });
  });

  it('keeps empty fields visible without prefilling content, and preserves the draft through history', async () => {
    const save = serve();
    respond(history('a'));
    await renderAdminApp('/automations/first', flags);
    await expect
      .element(emailCards().nth(1).getByRole('textbox', { name: 'Subject line' }))
      .toHaveValue('');
    await expect
      .element(emailCards().nth(1).getByRole('region', { name: 'Email message preview' }))
      .toHaveTextContent('Message');
    await emailCards().nth(0).getByRole('textbox').fill('Draft before history');
    await open();
    await select();
    await close();
    await expect
      .element(emailCards().nth(0).getByRole('textbox'))
      .toHaveValue('Draft before history');
    await emailCards().nth(0).getByRole('textbox').fill('');
    await expect
      .element(emailCards().nth(0).getByRole('textbox', { name: 'Subject line' }))
      .toHaveValue('');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect.poll(() => save.requests.length).toBe(1);
    const saved = (save.requests[0].body as { automations: AutomationDetail[] }).automations[0];
    expect(saved.actions[0].data).toMatchObject({ email_subject: '' });
    expect(saved.actions[2].data).toMatchObject({ email_subject: '', email_lexical: '' });
  });

  it('opens the existing content editor and updates the preview after clearing the body', async () => {
    const save = serve();
    fakeAdminEndpoint('GET', '/automated_emails/', { automated_emails: [] });
    fakeAdminEndpoint('GET', '/newsletters/?filter=status%3Aactive&limit=1', { newsletters: [] });
    fakeAdminEndpoint('GET', '/offers/', { offers: [] });
    fakeAdminEndpoint(
      'GET',
      '/posts/?filter=status%3Apublished&fields=id%2Curl%2Ctitle%2Cvisibility%2Cpublished_at&order=published_at+desc&limit=5',
      { posts: [] },
    );
    await renderAdminApp('/automations/first', flags);
    await emailCards().nth(0).getByRole('button', { name: 'Edit email content' }).click();
    const dialog = page.getByRole('dialog', { name: 'Edit email', exact: true });
    await expect.element(dialog).toBeVisible();
    const editor = dialog.getByRole('textbox');
    await expect.element(editor).toHaveTextContent('Thanks for joining.');
    await editor.fill('Rewritten message');
    await dialog.getByRole('button', { name: 'Save', exact: true }).click();
    await dialog.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect
      .element(emailCards().nth(0).getByRole('region', { name: 'Email message preview' }))
      .toHaveTextContent('Rewritten message');
    await emailCards().nth(0).getByRole('button', { name: 'Edit email content' }).click();
    await expect.element(dialog).toBeVisible();
    await dialog.getByRole('textbox').fill('');
    await dialog.getByRole('button', { name: 'Save', exact: true }).click();
    await dialog.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect
      .element(emailCards().nth(0).getByRole('region', { name: 'Email message preview' }))
      .toHaveTextContent('Message');
    await expect.element(emailCards().nth(0).getByRole('textbox')).toHaveValue('Welcome');
    expect(save.requests).toHaveLength(0);
  });

  it('retains publish validation and spaces following steps below a taller email card', async () => {
    serve();
    await renderAdminApp('/automations/first', flags);
    await page.getByRole('button', { name: 'Publish', exact: true }).click();
    await emailCards()
      .nth(1)
      .getByRole('button', { name: 'Why this step needs attention' })
      .click();
    await expect
      .element(page.getByText('Add a subject line and a message before this email can be sent.'))
      .toBeVisible();
    await userEvent.keyboard('{Escape}');
    await emailCards().nth(1).getByRole('textbox').fill('A subject');
    await emailCards()
      .nth(1)
      .getByRole('button', { name: 'Why this step needs attention' })
      .click();
    await expect
      .element(page.getByText('Add a message before this email can be sent.'))
      .toBeVisible();
    await userEvent.keyboard('{Escape}');
    await expect
      .element(emailCards().nth(1).getByRole('textbox'))
      .not.toHaveAttribute('aria-invalid', 'true');
    const wait = page.getByRole('article', { name: 'Wait: 1 day' });
    await expect
      .poll(
        () =>
          wait.element().getBoundingClientRect().top -
          emailCards().nth(0).element().getBoundingClientRect().bottom,
      )
      .toBeGreaterThan(80);
    const firstRect = emailCards().nth(0).element().getBoundingClientRect();
    const waitRect = wait.element().getBoundingClientRect();
    expect(
      Math.abs(firstRect.left + firstRect.width / 2 - waitRect.left - waitRect.width / 2),
    ).toBeLessThan(2);
  });
});
