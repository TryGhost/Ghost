import { describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { fakeAdminEndpoint, renderAdminApp } from '@test-utils/acceptance';
import { buildLexicalParagraph, settingsResponse } from '@tryghost/test-data';
import type {
  AutomationDetail,
  AutomationEmailStats,
  AutomationSendEmailAction,
} from '@tryghost/admin-x-framework/api/automations';
import {
  detail,
  setup,
  editingCanvas,
  history,
  respond,
  select,
  close,
} from './run-history.test-utils';

const stats: AutomationEmailStats = {
  email_sent_count: 100,
  email_opened_count: 75,
  email_clicked_count: 20,
  opened_rate: 75,
  clicked_rate: 20,
};
const email = (id: string, metrics: AutomationEmailStats = stats): AutomationSendEmailAction => ({
  id,
  type: 'send_email',
  stats: metrics,
  data: {
    email_subject: id,
    email_lexical: buildLexicalParagraph('Welcome'),
    email_design_setting_id: 'design',
  },
});
const prepare = (
  actions = [
    email('First'),
    email('Second', {
      ...stats,
      email_sent_count: 200,
      email_opened_count: 150,
      email_clicked_count: 40,
    }),
  ],
) => {
  setup();
  fakeAdminEndpoint('GET', '/automations/first/', {
    automations: [
      {
        ...detail('first'),
        actions,
        edges: actions.slice(1).map((action, index) => ({
          source_action_id: actions[index].id,
          target_action_id: action.id,
        })),
      },
    ],
  });
};
const boot = (tracking = true, redesigned = true) =>
  renderAdminApp('/automations/first', {
    labs: {
      automations: true,
      automationRunAnalytics: redesigned,
      automationAnalytics: true,
      automationsTinybirdSync: true,
    },
    boot: {
      browseSettings: {
        response: {
          settings: [
            ...settingsResponse().settings.filter(
              ({ key }) => !['email_track_opens', 'email_track_clicks'].includes(key),
            ),
            { key: 'email_track_opens', value: tracking },
            { key: 'email_track_clicks', value: tracking },
          ],
        },
      },
    },
  });
const panel = () => page.getByRole('complementary', { name: 'Email performance', exact: true });
const card = (name = 'First') =>
  editingCanvas().getByRole('article', { name: `Send email: ${name}` });
const show = (name = 'First') =>
  card(name).getByRole('button', { name: 'View email analytics' }).click();
const linksPath = (name = 'First') => `/automations/first/actions/${name}/links/`;

describe('Email performance sidebar', () => {
  it('returns focus to the stats button after closing with the keyboard', async () => {
    prepare([email('First')]);
    fakeAdminEndpoint('GET', linksPath(), { automation_action_links: [] });
    await boot();
    for (const key of ['{Enter}', '{Escape}']) {
      await show();
      const closeButton = panel().getByRole('button', { name: 'Close email performance' });
      closeButton.element().focus();
      await expect.element(closeButton).toHaveFocus();
      await userEvent.keyboard(key);
      await expect.element(panel()).not.toBeInTheDocument();
      await expect
        .element(card().getByRole('button', { name: 'View email analytics' }))
        .toHaveFocus();
    }
  });

  it('unmounts email performance while viewing run history', async () => {
    prepare([email('First')]);
    fakeAdminEndpoint('GET', linksPath(), { automation_action_links: [] });
    respond(history('a'));
    await boot();
    await show();
    const sidebar = panel().element();
    await page.getByRole('button', { name: 'Show performance', exact: true }).click();
    await select();
    await expect.element(sidebar).not.toBeInTheDocument();
    await close();
    await show();
    await expect.element(panel()).toBeVisible();
  });

  it.each(['email', 'automation'])(
    'dismisses the menu before the %s performance sidebar on Escape',
    async (sidebar) => {
      prepare([email('First')]);
      fakeAdminEndpoint('GET', linksPath(), { automation_action_links: [] });
      await boot();
      if (sidebar === 'email') {
        await show();
        await card().getByRole('button', { name: 'Email actions' }).click();
      } else {
        await page.getByRole('button', { name: 'Show performance', exact: true }).click();
        await page.getByRole('button', { name: 'Filter performance' }).click();
      }
      await expect.element(page.getByRole('menu')).toBeVisible();
      await userEvent.keyboard('{Escape}');
      await expect.element(page.getByRole('menu')).not.toBeInTheDocument();
      if (sidebar === 'email') {
        await expect.element(panel()).toBeVisible();
      } else {
        await expect
          .element(page.getByRole('button', { name: 'Hide performance', exact: true }))
          .toBeVisible();
      }
      await userEvent.keyboard('{Escape}');
      await expect.element(panel()).not.toBeInTheDocument();
      await expect
        .element(page.getByRole('button', { name: 'Show performance', exact: true }))
        .toBeVisible();
    },
  );

  it('keeps the sidebar in place while cancelling email deletion', async () => {
    prepare([email('First')]);
    fakeAdminEndpoint('GET', linksPath(), { automation_action_links: [] });
    await boot();
    await show();
    const sidebar = panel().element();
    await expect.poll(() => sidebar.getBoundingClientRect().width).toBe(400);
    await card().getByRole('button', { name: 'Email actions' }).click();
    await page.getByRole('menuitem', { name: 'Delete', exact: true }).click();
    await expect.element(page.getByRole('alertdialog')).toBeVisible();
    expect(sidebar.getBoundingClientRect().width).toBe(400);
    await userEvent.keyboard('{Escape}');
    await expect.element(page.getByRole('alertdialog')).not.toBeInTheDocument();
    await expect.element(panel()).toBeVisible();
    await expect.element(card()).toBeVisible();
  });

  it.each(['email', 'automation'])(
    'keeps the workflow visible after saving with %s performance open',
    async (sidebar) => {
      prepare([email('First')]);
      fakeAdminEndpoint('GET', linksPath(), { automation_action_links: [] });
      const save = fakeAdminEndpoint('PUT', '/automations/first/', ({ body }) => ({
        automations: [
          {
            ...detail('first'),
            ...(body as { automations: Partial<AutomationDetail>[] }).automations[0],
          },
        ],
      }));
      await boot();
      if (sidebar === 'email') {
        await show();
      } else {
        await page.getByRole('button', { name: 'Show performance', exact: true }).click();
      }
      await editingCanvas().getByRole('textbox', { name: 'Subject line' }).fill('Updated subject');
      await expect.element(card('Updated subject')).toBeVisible();
      let workflowDisappeared = false;
      const canvas = editingCanvas().element();
      const observer = new MutationObserver(() => {
        workflowDisappeared ||= [...canvas.querySelectorAll('.react-flow__node')].some(
          (node) => getComputedStyle(node).visibility === 'hidden',
        );
      });
      observer.observe(canvas, { attributes: true, subtree: true, attributeFilter: ['style'] });
      try {
        await page.getByRole('button', { name: 'Save', exact: true }).click();
        await expect.poll(() => save.requests.length).toBe(1);
        await expect
          .element(page.getByRole('button', { name: 'Save', exact: true }))
          .toBeDisabled();
        await expect.element(card('Updated subject')).toBeVisible();
        expect(workflowDisappeared).toBe(false);
      } finally {
        observer.disconnect();
      }
    },
  );

  it('closes on Escape even when the Ember shell prevents the default action', async () => {
    // The host's shortcuts mixin prevents default before dispatching closeMenus.
    const handleShellShortcut = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
      }
    };
    document.addEventListener('keydown', handleShellShortcut);
    try {
      prepare([email('First')]);
      fakeAdminEndpoint('GET', linksPath(), { automation_action_links: [] });
      await boot();
      await show();
      await expect.element(panel()).toBeVisible();
      await userEvent.keyboard('{Escape}');
      await expect.element(panel()).not.toBeInTheDocument();
    } finally {
      document.removeEventListener('keydown', handleShellShortcut);
    }
  });

  it('reserves space for the panel without covering the selected card at 1024px', async () => {
    await page.viewport(1024, 900);
    try {
      prepare();
      fakeAdminEndpoint('GET', linksPath(), { automation_action_links: [] });
      await boot();
      await show();
      await expect.element(panel()).toBeVisible();
      await expect
        .poll(() => card().element().getBoundingClientRect().right)
        .toBeLessThan(panel().element().getBoundingClientRect().left);
      await expect
        .element(card().getByRole('button', { name: 'Hide email analytics' }))
        .toBeVisible();
      await panel().getByRole('button', { name: 'Close email performance' }).click();
      await expect.poll(() => editingCanvas().element().getBoundingClientRect().width).toBe(1024);
    } finally {
      await page.viewport(1280, 800);
    }
  });

  it('switches in place, ignores late links from the previous email, and toggles closed', async () => {
    prepare();
    let resolve!: () => void;
    const pending = new Promise<void>((done) => {
      resolve = done;
    });
    const first = fakeAdminEndpoint('GET', linksPath(), async () => {
      await pending;
      return { automation_action_links: [{ url: 'https://example.com/old', clicked_count: 2 }] };
    });
    fakeAdminEndpoint('GET', linksPath('Second'), {
      automation_action_links: [{ url: 'https://example.com/new', clicked_count: 10 }],
    });
    await boot();
    await show();
    await expect.poll(() => first.requests.length).toBe(1);
    await expect.element(panel().getByTestId('automation-action-links-loading')).toBeVisible();
    const element = panel().element();
    await show('Second');
    await expect.element(panel().getByRole('heading', { name: 'Second' })).toBeVisible();
    expect(panel().element()).toBe(element);
    await expect.element(panel()).toHaveAttribute('data-state', 'open');
    await expect.element(panel().getByRole('link', { name: 'example.com/new' })).toBeVisible();
    resolve();
    await expect
      .element(panel().getByRole('link', { name: 'example.com/old' }))
      .not.toBeInTheDocument();
    await expect
      .element(panel().getByTestId('email-performance-sent-ring'))
      .not.toBeInTheDocument();
    await expect.element(panel().getByText('200', { exact: true })).toBeVisible();
    await expect.element(panel().getByText('75%', { exact: true })).toBeVisible();
    await expect.element(panel().getByRole('textbox')).not.toBeInTheDocument();
    await card('Second').getByRole('button', { name: 'Hide email analytics' }).click();
    await expect.element(panel()).not.toBeInTheDocument();
  });

  it('supports retry and closing without changing the draft', async () => {
    prepare([email('First')]);
    fakeAdminEndpoint(
      'GET',
      linksPath(),
      { errors: [{ message: 'Unavailable', type: 'InternalServerError' }] },
      { status: 500 },
    );
    await boot();
    await card().getByRole('textbox', { name: 'Subject line' }).fill('Draft subject');
    await show('Draft subject');
    await expect
      .element(panel().getByRole('alert'))
      .toHaveTextContent("Couldn't load clicked links.");
    const url =
      'https://example.com/a-very-long-path-that-needs-to-truncate-in-the-middle/final-destination';
    fakeAdminEndpoint('GET', linksPath(), {
      automation_action_links: [{ url, clicked_count: 10 }],
    });
    await panel().getByRole('button', { name: 'Retry' }).click();
    const link = panel().getByRole('link', { name: url.replace('https://', '') });
    await expect.element(link).toHaveAttribute('href', url);
    await expect.element(link).toBeVisible();
    await userEvent.keyboard('{Escape}');
    await expect.element(panel()).not.toBeInTheDocument();
    await expect
      .element(card('Draft subject').getByRole('textbox', { name: 'Subject line' }))
      .toHaveValue('Draft subject');
    await show('Draft subject');
    await panel().getByRole('button', { name: 'Close email performance' }).click();
    await expect.element(panel()).not.toBeInTheDocument();
    await show('Draft subject');
    await card('Draft subject').getByRole('heading', { name: 'Send email' }).click();
    await expect.element(panel()).toBeVisible();
    const subject = editingCanvas().getByRole('textbox', { name: 'Subject line' });
    await subject.click();
    await subject.fill('Updated with analytics open');
    await expect.element(subject).toHaveFocus();
    await expect.element(panel()).toBeVisible();
    await expect
      .element(panel().getByRole('heading', { name: 'Updated with analytics open' }))
      .toBeVisible();
  });

  it('shows only one performance sidebar at a time, including on wide screens', async () => {
    await page.viewport(1600, 900);
    try {
      prepare([email('First')]);
      fakeAdminEndpoint('GET', linksPath(), { automation_action_links: [] });
      await boot();
      await show();
      await page.getByRole('button', { name: 'Show performance', exact: true }).click();
      await expect.element(panel()).not.toBeInTheDocument();
      await expect
        .element(page.getByRole('button', { name: 'Hide performance', exact: true }))
        .toBeVisible();
      await show();
      await expect.element(panel()).toBeVisible();
      await expect
        .element(page.getByRole('button', { name: 'Show performance', exact: true }))
        .toBeVisible();
    } finally {
      await page.viewport(1280, 800);
    }
  });

  it('does not request links before any email has been sent', async () => {
    prepare([
      email('First', {
        email_sent_count: 0,
        email_opened_count: 0,
        email_clicked_count: 0,
        opened_rate: null,
        clicked_rate: null,
      }),
    ]);
    const links = fakeAdminEndpoint('GET', linksPath(), { automation_action_links: [] });
    await boot();
    await show();
    await expect.element(panel().getByText('No emails sent yet.')).toBeVisible();
    expect(links.requests).toHaveLength(0);
  });

  it('honors disabled tracking without presenting it as zero percent', async () => {
    prepare([email('First')]);
    const links = fakeAdminEndpoint('GET', linksPath(), { automation_action_links: [] });
    await boot(false);
    await show();
    await expect(panel().getByText('Off', { exact: true })).toHaveCount(2);
    await expect.element(panel().getByText('Top clicked links')).not.toBeInTheDocument();
    expect(links.requests).toHaveLength(0);
  });

  it('hides analytics controls when email analytics is disabled', async () => {
    prepare();
    await renderAdminApp('/automations/first', {
      labs: { automations: true, automationRunAnalytics: true, automationAnalytics: false },
    });
    await expect.element(card()).toBeVisible();
    await expect
      .element(page.getByRole('button', { name: 'View email analytics' }))
      .not.toBeInTheDocument();
    await expect.element(panel()).not.toBeInTheDocument();
  });

  it('hides the analytics button for emails without stats', async () => {
    prepare([{ ...email('First'), stats: undefined }]);
    await boot();
    await expect.element(card()).toBeVisible();
    await expect
      .element(card().getByRole('button', { name: 'View email analytics' }))
      .not.toBeInTheDocument();
  });

  it('retains the three-ring settings sidebar with the redesign flag off', async () => {
    prepare([email('First')]);
    fakeAdminEndpoint('GET', linksPath(), { automation_action_links: [] });
    await boot(true, false);
    await page.getByRole('button', { name: 'Send email: First' }).click();
    const legacy = page.getByRole('complementary', { name: 'Step details' });
    await expect.element(legacy.getByPlaceholder('Subject line')).toBeVisible();
    await expect.element(legacy.getByTestId('email-performance-sent-ring')).toBeVisible();
    await expect.element(panel()).not.toBeInTheDocument();
  });

  it.each(['subject', 'email body'])(
    'keeps the workflow visible after editing the %s and saving with the redesign flag off',
    async (field) => {
      prepare([email('First')]);
      fakeAdminEndpoint('GET', linksPath(), { automation_action_links: [] });
      fakeAdminEndpoint('GET', '/automated_emails/', { automated_emails: [] });
      fakeAdminEndpoint('GET', '/newsletters/?filter=status%3Aactive&limit=1', { newsletters: [] });
      fakeAdminEndpoint('GET', '/offers/', { offers: [] });
      fakeAdminEndpoint(
        'GET',
        '/posts/?filter=status%3Apublished&fields=id%2Curl%2Ctitle%2Cvisibility%2Cpublished_at&order=published_at+desc&limit=5',
        { posts: [] },
      );
      const save = fakeAdminEndpoint('PUT', '/automations/first/', ({ body }) => ({
        automations: [
          {
            ...detail('first'),
            ...(body as { automations: Partial<AutomationDetail>[] }).automations[0],
          },
        ],
      }));
      await boot(true, false);
      await page.getByRole('button', { name: 'Send email: First' }).click();
      const sidebar = page.getByRole('complementary', { name: 'Step details' });
      if (field === 'subject') {
        await sidebar.getByPlaceholder('Subject line').fill('Updated subject');
      } else {
        await sidebar.getByRole('button', { name: 'Edit email', exact: true }).click();
        const dialog = page.getByRole('dialog', { name: 'Edit email', exact: true });
        await dialog.getByRole('textbox').fill('Updated message');
        await dialog.getByRole('button', { name: 'Save', exact: true }).click();
        await dialog.getByRole('button', { name: 'Close', exact: true }).click();
      }
      let workflowDisappeared = false;
      const canvas = editingCanvas().element();
      const observer = new MutationObserver(() => {
        workflowDisappeared ||= [...canvas.querySelectorAll('.react-flow__node')].some(
          (node) => getComputedStyle(node).visibility === 'hidden',
        );
      });
      observer.observe(canvas, { attributes: true, subtree: true, attributeFilter: ['style'] });
      try {
        await page.getByRole('button', { name: 'Save', exact: true }).click();
        await expect.poll(() => save.requests.length).toBe(1);
        await expect
          .element(page.getByRole('button', { name: 'Save', exact: true }))
          .toBeDisabled();
        await expect.element(sidebar).toBeVisible();
        await expect
          .element(
            page.getByRole('button', {
              name: `Send email: ${field === 'subject' ? 'Updated subject' : 'First'}`,
            }),
          )
          .toBeVisible();
        expect(workflowDisappeared).toBe(false);
      } finally {
        observer.disconnect();
      }
    },
  );
});
