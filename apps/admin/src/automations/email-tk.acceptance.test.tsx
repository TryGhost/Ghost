import { describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import {
  fakeAdminEndpoint,
  fakeAutomatedEmails,
  fakeNewsletters,
  fakeOffers,
  fakePosts,
  renderAdminApp,
} from '@test-utils/acceptance';
import type {
  AutomationDetail,
  AutomationSendEmailAction,
} from '@tryghost/admin-x-framework/api/automations';
import { buildLexicalParagraph } from '@tryghost/test-data';
import { detail, setup } from './run-history.test-utils';

const email = (subject = 'Welcome', body = 'TK', id = 'email'): AutomationSendEmailAction => ({
  id,
  type: 'send_email',
  data: {
    email_subject: subject,
    email_lexical: buildLexicalParagraph(body),
    email_design_setting_id: 'design',
  },
});
const card = () => page.getByRole('article', { name: /^Send email/ }).first();
const badge = () => card().getByRole('img', { name: /Unresolved TK reminders/ });
const subject = () => card().getByRole('textbox', { name: 'Subject line' });
const dialog = () => page.getByRole('alertdialog');
const modal = () => page.getByRole('dialog', { name: 'Edit email', exact: true });
const publishButton = () => page.getByRole('button', { name: /^Publish( changes)?$/ });
const serve = (overrides: Partial<AutomationDetail> = {}, { failFirst = false } = {}) => {
  let data = { ...detail('first'), actions: [email()], edges: [], ...overrides };
  setup(data.id, []);
  fakeAdminEndpoint('GET', `/automations/${data.id}/`, () => ({ automations: [data] }));
  let requests = 0;
  return fakeAdminEndpoint('PUT', `/automations/${data.id}/`, ({ body }) => {
    requests += 1;
    if (failFirst && requests === 1) {
      return Response.json(
        { errors: [{ message: 'Please retry', type: 'ValidationError' }] },
        { status: 422 },
      );
    }
    data = { ...data, ...(body as { automations: Partial<AutomationDetail>[] }).automations[0] };
    return { automations: [data] };
  });
};
const boot = () => renderAdminApp('/automations/first', { labs: { automations: true } });

describe('Automation TK reminders', () => {
  it('keeps malformed content blocking even when the subject has TKs', async () => {
    const malformed = email('TK');
    malformed.data.email_lexical = '{';
    const save = serve({ actions: [malformed] });
    await boot();
    await expect.element(badge()).toBeVisible();
    await publishButton().click();
    await expect(dialog()).toHaveCount(0);
    await card().getByRole('button', { name: 'Why this step needs attention' }).click();
    await expect.element(page.getByText(/Email content could not be read/)).toBeVisible();
    expect(save.requests).toHaveLength(0);
  });

  it('starts a fresh publication attempt after switching automations', async () => {
    serve();
    const secondSave = serve({ id: 'second', actions: [email('Second TK')] });
    await boot();
    await publishButton().click();
    await dialog().getByRole('button', { name: 'Publish anyway' }).click();
    await expect(dialog()).toHaveCount(0);
    window.location.hash = '#/automations/second';
    await expect.element(subject()).toHaveValue('Second TK');
    await publishButton().click();
    await expect.element(dialog().getByRole('button', { name: 'Publish anyway' })).toBeVisible();
    expect(secondSave.requests).toHaveLength(0);
  });

  it('keeps adjacent indicators and keyboard focus usable on a narrow screen', async () => {
    serve({ actions: [email('')] });
    await page.viewport(390, 844);
    try {
      await boot();
      await expect.element(badge()).toBeVisible();
      const warning = card().getByRole('button', { name: 'Why this step needs attention' });
      await expect.element(warning).toBeVisible();
      expect(badge().element().getBoundingClientRect().right).toBeLessThanOrEqual(
        warning.element().getBoundingClientRect().left,
      );
      await subject().fill('Welcome');
      await publishButton().click();
      await expect.element(dialog().getByRole('button', { name: 'Back to editing' })).toHaveFocus();
      await userEvent.keyboard('{Tab}');
      await expect.element(dialog().getByRole('button', { name: 'Publish anyway' })).toHaveFocus();
      await userEvent.keyboard('{Escape}');
      await expect(dialog()).toHaveCount(0);
      await expect.element(publishButton()).toHaveFocus();
    } finally {
      await page.viewport(1280, 800);
    }
  });

  it.each(['inactive', 'active'] as const)(
    'shows unopened body TKs alongside errors in %s drafts',
    async (status) => {
      const save = serve({ status, actions: [email('')] });
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
      await publishButton().click();
      await expect(dialog()).toHaveCount(0);
      expect(save.requests).toHaveLength(0);
    },
  );

  it('updates subject-only reminders immediately and permits an inactive draft save', async () => {
    const save = serve({ actions: [email('Welcome', 'Ready')] });
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
      const save = serve({
        status,
        actions: [email(), email('Next steps TK', 'Ready', 'second-email')],
        edges: [{ source_action_id: 'email', target_action_id: 'second-email' }],
      });
      await boot();
      await subject().fill('Updated welcome');
      await publishButton().click();
      await expect
        .element(dialog().getByText('Unresolved TK reminders', { exact: true }))
        .toBeVisible();
      await expect.element(dialog()).toHaveAccessibleDescription(/unresolved TK reminders/);
      if (status === 'active') {
        await expect.element(dialog().getByText(/members already in progress/)).toBeVisible();
      }
      const list = dialog().getByRole('list', { name: 'Emails with TK reminders' });
      await expect.element(list).toHaveTextContent('Updated welcome');
      await expect.element(list).toHaveTextContent('Next steps TK');
      await expect(list.getByRole('listitem')).toHaveCount(2);
      await dialog().getByRole('button', { name: 'Publish anyway' }).click();
      await expect.poll(() => save.requests.length).toBe(1);
      await expect(dialog()).toHaveCount(0);
      expect(
        (save.lastRequest?.body as { automations: AutomationDetail[] }).automations[0],
      ).toMatchObject({
        status: 'active',
        actions: [email('Updated welcome'), email('Next steps TK', 'Ready', 'second-email')],
      });
    },
  );

  it('rechecks a new attempt after cancellation and never retains acknowledgment', async () => {
    serve({ actions: [email('TK', 'Ready')] });
    await boot();
    await publishButton().click();
    await dialog().getByRole('button', { name: 'Back to editing' }).click();
    await expect(dialog()).toHaveCount(0);
    await subject().fill('Ready');
    await publishButton().click();
    await expect(dialog().getByRole('button', { name: 'Publish anyway' })).toHaveCount(0);
    await dialog().getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog()).toHaveCount(0);
    await subject().fill('TK again');
    await publishButton().click();
    await expect.element(dialog().getByRole('button', { name: 'Publish anyway' })).toBeVisible();
  });

  it('retries the same warned content without opening another confirmation', async () => {
    const save = serve({}, { failFirst: true });
    await boot();
    await publishButton().click();
    await dialog().getByRole('button', { name: 'Publish anyway' }).click();
    await expect.element(dialog().getByRole('button', { name: 'Retry' })).toBeVisible();
    await expect(dialog()).toHaveCount(1);
    await dialog().getByRole('button', { name: 'Retry' }).click();
    await expect(dialog()).toHaveCount(0);
    expect(save.requests).toHaveLength(2);
    expect(save.requests[1].body).toEqual(save.requests[0].body);
  });

  it('keeps body edits local until Save, discards them, and highlights on reopen', async () => {
    serve({ actions: [email('Welcome', 'Ready')] });
    fakeAutomatedEmails([]);
    fakeNewsletters([]);
    fakeOffers([]);
    fakePosts([]);
    await boot();
    await card().getByRole('button', { name: 'Edit email content' }).click();
    await modal().getByRole('textbox').fill('TK draft');
    await expect.poll(() => modal().element().querySelector('[data-kg-tk="true"]')).not.toBeNull();
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
    await expect.poll(() => modal().element().querySelector('[data-kg-tk="true"]')).not.toBeNull();
    await modal().getByRole('textbox').fill('Finished');
    await modal().getByRole('button', { name: 'Save', exact: true }).click();
    await expect.element(modal().getByRole('button', { name: 'Saved', exact: true })).toBeVisible();
    await modal().getByRole('button', { name: 'Close', exact: true }).click();
    await expect(modal()).toHaveCount(0);
    await expect(badge()).toHaveCount(0);
  });
});
