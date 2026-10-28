import { describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { fakeAdminEndpoint, renderAdminApp, settingsResponse } from '@test-utils/acceptance';
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
import {
  editEmailSubject,
  emailEditor,
  emailEditorBody,
  fakeEmailEditorData,
  minimizeEmailEditor,
} from './email-editor.test-utils';

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
const preview = (card: ReturnType<typeof emailCards>) =>
  card.getByRole('region', { name: 'Email message preview' });
const serve = () => {
  setup();
  fakeEmailEditorData();
  const data = workflow();
  fakeAdminEndpoint('GET', '/automations/first/', { automations: [data] });
  return fakeAdminEndpoint('PUT', '/automations/first/', ({ body }) => ({
    automations: [
      { ...data, ...(body as { automations: Partial<AutomationDetail>[] }).automations[0] },
    ],
  }));
};

describe('Editable email cards', () => {
  it('keeps email cards editable when run analytics is absent', async () => {
    serve();
    await renderAdminApp('/automations/first', { labs: { automations: true } });
    await expect(emailCards()).toHaveCount(2);
    await expect.element(preview(emailCards().first())).toHaveTextContent('Welcome');
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
    await expect
      .element(page.getByRole('menuitem', { name: 'Edit settings' }))
      .not.toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    // Let the menu finish unmounting and restoring focus before the next app mounts.
    await expect
      .poll(() => document.querySelector('[data-slot="dropdown-menu-content"]'))
      .toBeNull();
    await emailCards().nth(0).getByRole('button', { name: 'Edit email content' }).click();
    await expect.element(emailEditor()).toBeVisible();
    expect(save.requests).toHaveLength(0);
  });

  it('keeps separate email drafts and saves through the existing automation Save action', async () => {
    const save = serve();
    await renderAdminApp('/automations/first', flags);
    await editEmailSubject(emailCards().nth(0), 'Updated welcome');
    await editEmailSubject(emailCards().nth(1), 'Follow up');
    await expect.element(preview(emailCards().nth(0))).toHaveTextContent('Updated welcome');
    await expect.element(preview(emailCards().nth(1))).toHaveTextContent('Follow up');
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
    await expect.element(preview(emailCards().nth(1))).toHaveTextContent('SubjectMessage');
    await editEmailSubject(emailCards().nth(0), 'Draft before history');
    await open();
    await select();
    await close();
    await expect.element(preview(emailCards().nth(0))).toHaveTextContent('Draft before history');
    await editEmailSubject(emailCards().nth(0), '');
    await expect.element(preview(emailCards().nth(0))).toHaveTextContent('Subject');
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
    await expect.element(emailEditor()).toBeVisible();
    await expect.element(emailEditorBody()).toHaveTextContent('Thanks for joining.');
    await emailEditorBody().fill('Rewritten message');
    await minimizeEmailEditor();
    await expect.element(preview(emailCards().nth(0))).toHaveTextContent('Rewritten message');
    await emailCards().nth(0).getByRole('button', { name: 'Edit email content' }).click();
    await expect.element(emailEditor()).toBeVisible();
    await emailEditorBody().fill('');
    await minimizeEmailEditor();
    await expect.element(preview(emailCards().nth(0))).toHaveTextContent('WelcomeMessage');
    expect(save.requests).toHaveLength(0);
  });

  it('can pick a callout emoji in the automation email modal', async () => {
    serve();
    await renderAdminApp('/automations/first', flags);
    await emailCards().nth(0).getByRole('button', { name: 'Edit email content' }).click();
    const dialog = emailEditor();
    await emailEditorBody().fill('');
    await emailEditorBody().click();
    await userEvent.keyboard('/callout');
    await expect
      .element(page.getByRole('menuitem', { name: 'Callout', exact: true }))
      .toBeVisible();
    await userEvent.keyboard('{Enter}');
    await dialog.getByRole('button', { name: '💡', exact: true }).click();
    await page.getByRole('searchbox').fill('taco');
    await page.getByRole('button', { name: '🌮', exact: true }).click();
    await expect.element(dialog.getByRole('button', { name: '🌮', exact: true })).toBeVisible();
  });

  it.each([false, true])(
    'shows Unsplash in the content editor slash menu only when Unsplash enabled is %s',
    async (enabled) => {
      serve();
      fakeAdminEndpoint('GET', '/automated_emails/', { automated_emails: [] });
      fakeAdminEndpoint('GET', '/newsletters/?filter=status%3Aactive&limit=1', { newsletters: [] });
      fakeAdminEndpoint('GET', '/offers/', { offers: [] });
      fakeAdminEndpoint(
        'GET',
        '/posts/?filter=status%3Apublished&fields=id%2Curl%2Ctitle%2Cvisibility%2Cpublished_at&order=published_at+desc&limit=5',
        { posts: [] },
      );
      await renderAdminApp('/automations/first', {
        ...flags,
        boot: {
          browseSettings: { response: settingsResponse({ settings: { unsplash: enabled } }) },
        },
      });
      await emailCards().nth(0).getByRole('button', { name: 'Edit email content' }).click();
      await emailEditorBody().fill('');
      await emailEditorBody().click();
      await userEvent.keyboard('/');
      await expect
        .element(page.getByRole('menuitem', { name: 'Image', exact: true }))
        .toBeVisible();

      const unsplash = page.getByRole('menuitem', { name: 'Unsplash', exact: true });
      if (enabled) {
        await expect.element(unsplash).toBeVisible();
      } else {
        await expect(unsplash).toHaveCount(0);
      }
    },
  );

  it('retains publish validation and spaces following steps below a taller email card', async () => {
    serve();
    // Keep this three-card fixture visible without scrolling the transformed canvas DOM.
    await page.viewport(1280, 1600);
    try {
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
      await editEmailSubject(emailCards().nth(1), 'A subject');
      await emailCards()
        .nth(1)
        .getByRole('button', { name: 'Why this step needs attention' })
        .click();
      await expect
        .element(page.getByText('Add a message before this email can be sent.'))
        .toBeVisible();
      await userEvent.keyboard('{Escape}');
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
    } finally {
      await page.viewport(1280, 800);
    }
  });

  it('defers a new empty email warning until another step is used or publishing is attempted', async () => {
    serve();
    const data = workflow();
    fakeAdminEndpoint('GET', '/automations/first/', {
      automations: [{ ...data, actions: [data.actions[0]], edges: [] }],
    });
    await page.viewport(1280, 1600);
    try {
      await renderAdminApp('/automations/first', flags);
      const addEmail = async () => {
        await page.getByRole('button', { name: 'Add step', exact: true }).click();
        await page.getByRole('button', { name: 'Email Send an email', exact: true }).click();
      };
      await addEmail();
      const newCard = emailCards().nth(1);
      const warning = newCard.getByRole('button', { name: 'Why this step needs attention' });
      await expect(warning).toHaveCount(0);
      await editEmailSubject(newCard, 'New subject');
      await expect(warning).toHaveCount(0);
      await emailCards().nth(0).getByRole('heading', { name: 'Send email' }).click();
      await expect.element(warning).toBeVisible();

      await addEmail();
      const nextWarning = emailCards()
        .nth(2)
        .getByRole('button', { name: 'Why this step needs attention' });
      await expect(nextWarning).toHaveCount(0);
      await page.getByRole('button', { name: 'Publish', exact: true }).click();
      await expect.element(nextWarning).toBeVisible();
    } finally {
      await page.viewport(1280, 800);
    }
  });
});
