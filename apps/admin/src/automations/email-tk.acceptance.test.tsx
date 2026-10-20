import { describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import {
  fakeAdminEndpoint,
  fakeAutomatedEmails,
  fakeNewsletters,
  fakeOffers,
  fakePosts,
  renderAdminApp,
  currentUserResponse,
} from '@test-utils/acceptance';
import type { AutomationDetail } from '@tryghost/admin-x-framework/api/automations';
import { detail, setup } from './run-history.test-utils';

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
const card = () => page.getByRole('article', { name: /^Send email/ }).first();
const badge = () => card().getByRole('img', { name: /Unresolved TK reminders/ });
const subject = () => card().getByRole('textbox', { name: 'Subject line' });
const dialog = () => page.getByRole('alertdialog');
const modal = () => page.getByRole('dialog', { name: 'Edit email', exact: true });
const serve = ({
  status = 'inactive',
  emailSubject = 'Welcome',
  body = 'TK',
  failFirst = false,
  id = 'first',
  extraEmail = false,
  serializedBody,
}: {
  status?: AutomationDetail['status'];
  emailSubject?: string;
  body?: string;
  failFirst?: boolean;
  id?: string;
  extraEmail?: boolean;
  serializedBody?: string;
} = {}) => {
  setup(id);
  const data: AutomationDetail = {
    ...detail(id),
    status,
    actions: [
      {
        id: 'email',
        type: 'send_email',
        data: {
          email_subject: emailSubject,
          email_lexical: serializedBody ?? lexical(body),
          email_design_setting_id: 'design',
        },
      },
    ],
    edges: [],
  };
  if (extraEmail) {
    data.actions.push({
      id: 'second-email',
      type: 'send_email',
      data: {
        email_subject: 'Next steps TK',
        email_lexical: lexical('Ready'),
        email_design_setting_id: 'design',
      },
    });
    data.edges.push({ source_action_id: 'email', target_action_id: 'second-email' });
  }
  fakeAdminEndpoint('GET', `/automations/${id}/`, { automations: [data] });
  let requests = 0;
  return fakeAdminEndpoint('PUT', `/automations/${id}/`, ({ body: payload }) => {
    requests += 1;
    if (failFirst && requests === 1) {
      return new Response(
        JSON.stringify({ errors: [{ message: 'Please retry', type: 'ValidationError' }] }),
        { status: 422 },
      );
    }
    return {
      automations: [
        { ...data, ...(payload as { automations: Partial<AutomationDetail>[] }).automations[0] },
      ],
    };
  });
};
const boot = () => renderAdminApp('/automations/first', { labs: { automations: true } });
const editorReads = () => {
  fakeAutomatedEmails([]);
  fakeNewsletters([]);
  fakeOffers([]);
  fakePosts([]);
};

describe('Automation TK reminders', () => {
  it('lists every affected email without counting individual markers', async () => {
    serve({ extraEmail: true });
    await boot();
    await page.getByRole('button', { name: 'Publish', exact: true }).click();
    const list = dialog().getByRole('list', { name: 'Emails with TK reminders' });
    await expect.element(list).toHaveTextContent('Welcome');
    await expect.element(list).toHaveTextContent('Next steps TK');
    await expect(list.getByRole('listitem')).toHaveCount(2);
  });

  it('keeps malformed content blocking even when the subject has TKs', async () => {
    const save = serve({ emailSubject: 'TK', serializedBody: '{' });
    await boot();
    await expect.element(badge()).toBeVisible();
    await page.getByRole('button', { name: 'Publish', exact: true }).click();
    await expect(dialog()).toHaveCount(0);
    await card().getByRole('button', { name: 'Why this step needs attention' }).click();
    await expect.element(page.getByText(/Email content could not be read/)).toBeVisible();
    expect(save.requests).toHaveLength(0);
  });

  it('starts a fresh publication attempt after switching automations', async () => {
    serve();
    const secondSave = serve({ id: 'second', emailSubject: 'Second TK' });
    await boot();
    await page.getByRole('button', { name: 'Publish', exact: true }).click();
    await dialog().getByRole('button', { name: 'Publish anyway' }).click();
    await expect(dialog()).toHaveCount(0);
    window.location.hash = '#/automations/second';
    await expect.element(subject()).toHaveValue('Second TK');
    await page.getByRole('button', { name: 'Publish', exact: true }).click();
    await expect.element(dialog().getByRole('button', { name: 'Publish anyway' })).toBeVisible();
    expect(secondSave.requests).toHaveLength(0);
  });

  it.each(['light', 'dark'])(
    'keeps adjacent reminders and warning actions usable on narrow screens in %s mode',
    async (theme) => {
      serve({ emailSubject: '' });
      const me = currentUserResponse();
      me.users[0].accessibility = JSON.stringify({ nightShift: theme });
      await page.viewport(390, 844);
      try {
        await renderAdminApp('/automations/first', {
          labs: { automations: true },
          boot: { browseMe: { response: me } },
        });
        await expect.element(badge()).toBeVisible();
        const warning = card().getByRole('button', { name: 'Why this step needs attention' });
        await expect.element(warning).toBeVisible();
        const badgeRect = badge().element().getBoundingClientRect();
        const warningRect = warning.element().getBoundingClientRect();
        expect(badgeRect.right).toBeLessThanOrEqual(warningRect.left);
        await subject().fill('Welcome');
        await page.getByRole('button', { name: 'Publish', exact: true }).click();
        await expect
          .element(dialog().getByRole('button', { name: 'Back to editing' }))
          .toHaveFocus();
        await userEvent.keyboard('{Tab}');
        await expect
          .element(dialog().getByRole('button', { name: 'Publish anyway' }))
          .toHaveFocus();
        await userEvent.keyboard('{Escape}');
        await expect(dialog()).toHaveCount(0);
        await expect
          .element(page.getByRole('button', { name: 'Publish', exact: true }))
          .toHaveFocus();
      } finally {
        await page.viewport(1280, 800);
      }
    },
  );

  it.each(['inactive', 'active'] as const)(
    'shows unopened body TKs alongside errors in %s drafts',
    async (status) => {
      const save = serve({ status, emailSubject: '' });
      await boot();
      await expect.element(badge()).toBeVisible();
      await expect
        .element(card().getByRole('button', { name: 'Why this step needs attention' }))
        .toBeVisible();
      await subject().fill('TK subject');
      await expect(badge()).toHaveCount(1);
      await expect
        .element(badge())
        .toHaveAccessibleName('Unresolved TK reminders in the subject and body of this email.');
      await subject().fill(' ');
      await page
        .getByRole('button', {
          name: status === 'active' ? 'Publish changes' : 'Publish',
          exact: true,
        })
        .click();
      await expect(dialog()).toHaveCount(0);
      expect(save.requests).toHaveLength(0);
    },
  );

  it('updates subject-only reminders immediately and permits an inactive draft save', async () => {
    const save = serve({ body: 'Ready' });
    await boot();
    await expect(badge()).toHaveCount(0);
    await subject().fill('Welcome TK');
    await expect.element(badge()).toBeVisible();
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect.poll(() => save.requests.length).toBe(1);
    await expect(dialog()).toHaveCount(0);
    await subject().fill('Ready');
    await expect(badge()).toHaveCount(0);
  });

  it.each(['inactive', 'archived', 'active'] as const)(
    'warns before publishing %s content and allows explicit continuation',
    async (status) => {
      const save = serve({ status });
      await boot();
      if (status === 'active') {
        await subject().fill('Updated welcome');
      }
      const publish = page.getByRole('button', {
        name: status === 'active' ? 'Publish changes' : 'Publish',
        exact: true,
      });
      await publish.click();
      await expect
        .element(dialog().getByText('Unresolved TK reminders', { exact: true }))
        .toBeVisible();
      await expect.element(dialog()).toHaveAccessibleDescription(/unresolved TK reminders/);
      if (status === 'active') {
        await expect.element(dialog().getByText(/members already in progress/)).toBeVisible();
      }
      await dialog().getByRole('button', { name: 'Back to editing' }).click();
      await expect(dialog()).toHaveCount(0);
      await expect.element(publish).toHaveFocus();
      expect(save.requests).toHaveLength(0);
      await publish.click();
      await dialog().getByRole('button', { name: 'Publish anyway' }).click();
      await expect.poll(() => save.requests.length).toBe(1);
      await expect(dialog()).toHaveCount(0);
      expect(
        (save.lastRequest?.body as { automations: AutomationDetail[] }).automations[0].status,
      ).toBe('active');
    },
  );

  it('rechecks a new attempt after cancellation and never retains acknowledgment', async () => {
    serve({ body: 'Ready', emailSubject: 'TK' });
    await boot();
    const publish = page.getByRole('button', { name: 'Publish', exact: true });
    await publish.click();
    await userEvent.keyboard('{Escape}');
    await expect(dialog()).toHaveCount(0);
    await expect.element(publish).toHaveFocus();
    await subject().fill('Ready');
    await publish.click();
    await expect(dialog().getByRole('button', { name: 'Publish anyway' })).toHaveCount(0);
    await dialog().getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog()).toHaveCount(0);
    await subject().fill('TK again');
    await publish.click();
    await expect.element(dialog().getByRole('button', { name: 'Publish anyway' })).toBeVisible();
  });

  it('retries the same warned content without opening another confirmation', async () => {
    const save = serve({ failFirst: true });
    await boot();
    await page.getByRole('button', { name: 'Publish', exact: true }).click();
    await dialog().getByRole('button', { name: 'Publish anyway' }).click();
    await expect.element(dialog().getByRole('button', { name: 'Retry' })).toBeVisible();
    await expect(dialog()).toHaveCount(1);
    await dialog().getByRole('button', { name: 'Retry' }).click();
    await expect(dialog()).toHaveCount(0);
    expect(save.requests).toHaveLength(2);
  });

  it('keeps body edits local until Save, discards them, and highlights on reopen', async () => {
    serve({ body: 'Ready' });
    editorReads();
    await boot();
    await card().getByRole('button', { name: 'Edit email content' }).click();
    await modal().getByRole('textbox').fill('TK draft');
    await expect
      .element(modal().getByRole('img', { name: /Unresolved TK reminders/ }))
      .toBeVisible();
    await modal().getByRole('button', { name: 'Close', exact: true }).click();
    await dialog().getByRole('button', { name: 'Discard', exact: true }).click();
    await expect(modal()).toHaveCount(0);
    await expect(badge()).toHaveCount(0);
    await card().getByRole('button', { name: 'Edit email content' }).click();
    await modal().getByRole('textbox').fill('TKTK draft');
    await modal().getByRole('button', { name: 'Save', exact: true }).click();
    await expect.element(modal().getByRole('button', { name: 'Saved', exact: true })).toBeVisible();
    await modal().getByRole('button', { name: 'Close', exact: true }).click();
    await expect(modal()).toHaveCount(0);
    await expect.element(badge()).toBeVisible();
    await card().getByRole('button', { name: 'Edit email content' }).click();
    await expect.element(modal().getByRole('textbox')).toHaveTextContent('TKTK draft');
    expect(modal().element().querySelector('[data-kg-tk="true"]')).not.toBeNull();
    await modal().getByRole('textbox').fill('Finished');
    await modal().getByRole('button', { name: 'Save', exact: true }).click();
    await expect.element(modal().getByRole('button', { name: 'Saved', exact: true })).toBeVisible();
    await modal().getByRole('button', { name: 'Close', exact: true }).click();
    await expect(modal()).toHaveCount(0);
    await expect(badge()).toHaveCount(0);
  });
});
