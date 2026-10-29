import { performanceBoot } from './run-list.test-utils';
import { describe, expect, it } from 'vitest';
import { automationsScreen } from './automations.screen';
import { page, userEvent } from 'vitest/browser';
import { openAutomationSidebar } from './run-list.test-utils';
import { fakeAdminEndpoint, renderAdminApp, settleTransitions } from '@test-utils/acceptance';
import { buildLexicalParagraph, settingsResponse } from '@tryghost/test-data';
import type {
  AutomationActionLink,
  AutomationDetail,
  AutomationEmailStats,
  AutomationSendEmailAction,
} from '@tryghost/admin-x-framework/api/automations';
import { detail, setup, editingCanvas } from './run-history.test-utils';

const stats: AutomationEmailStats = {
  email_sent_count: 100,
  email_opened_count: 75,
  email_clicked_count: 20,
  opened_rate: 75,
  clicked_rate: 20,
};
const unclicked: AutomationEmailStats = { ...stats, email_clicked_count: 0, clicked_rate: 0 };
const unsent: AutomationEmailStats = {
  email_sent_count: 0,
  email_opened_count: 0,
  email_clicked_count: 0,
  opened_rate: null,
  clicked_rate: null,
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
const links = (count: number): AutomationActionLink[] =>
  Array.from({ length: count }, (_, index) => ({
    url: `https://example.com/link-${index + 1}`,
    clicked_count: count - index,
  }));
const linksPath = (name = 'First') => `/automations/first/actions/${name}/links/`;
const prepare = (actions = [email('First')]) => {
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
const boot = ({ opens = true, clicks = true } = {}) =>
  renderAdminApp('/automations/first', {
    labs: {
      automations: true,
    },
    boot: {
      ...performanceBoot,
      browseSettings: {
        response: {
          settings: [
            ...settingsResponse().settings.filter(
              ({ key }) => !['email_track_opens', 'email_track_clicks'].includes(key),
            ),
            { key: 'email_track_opens', value: opens },
            { key: 'email_track_clicks', value: clicks },
          ],
        },
      },
    },
  });
const card = automationsScreen.emailCard;
const toggle = automationsScreen.emailAnalyticsToggle;
const show = async (name = 'First') => {
  await settleTransitions();
  await toggle(name).click();
  await expect.element(toggle(name)).toHaveAttribute('aria-pressed', 'true');
  await settleTransitions();
};
const height = (name = 'First') => card(name).element().getBoundingClientRect().height;
const OFF = 'Tracking is off in Analytics settings.';

describe('Email card analytics', () => {
  it('switches the card in place, keeping focus on the pressed toggle', async () => {
    prepare();
    fakeAdminEndpoint('GET', linksPath(), { automation_action_links: links(2) });
    await boot();
    const subject = card().getByRole('textbox', { name: 'Subject line' });
    await expect.element(subject).toBeVisible();
    await expect.element(toggle()).toHaveAttribute('aria-pressed', 'false');

    toggle().element().focus();
    await userEvent.keyboard('{Enter}');
    await expect.element(toggle()).toHaveAttribute('aria-pressed', 'true');
    await expect.element(toggle()).toHaveFocus();
    // Collapsed, the email leaves the tab order.
    await expect.poll(() => subject.element().closest('[inert]')).not.toBeNull();
    await expect.element(card().getByText('Unique clicks per link')).toBeVisible();
    await expect
      .element(card().getByRole('link', { name: 'example.com/link-1' }))
      .toHaveAttribute('href', 'https://example.com/link-1');

    await userEvent.keyboard('{Enter}');
    await expect.element(toggle()).toHaveAttribute('aria-pressed', 'false');
    await expect.element(subject).toBeVisible();
  });

  it('opens each card on its own and never shrinks a card below its email view', async () => {
    prepare([email('First'), email('Second', unsent)]);
    fakeAdminEndpoint('GET', linksPath(), { automation_action_links: links(1) });
    await boot();
    await expect.element(toggle('Second')).toBeVisible();
    await settleTransitions();
    const closedHeight = height('Second');

    await show();
    await show('Second');
    await expect.element(toggle()).toHaveAttribute('aria-pressed', 'true');
    await expect.element(card('Second').getByText('No click data yet')).toBeVisible();
    expect(height('Second')).toBeGreaterThanOrEqual(closedHeight);
  });

  it('pages through many links, ten at a time', async () => {
    prepare();
    fakeAdminEndpoint('GET', linksPath(), { automation_action_links: links(12) });
    await boot();
    await show();
    await expect(card().getByRole('link')).toHaveCount(10);
    await expect.element(card().getByRole('button', { name: 'Previous page' })).toBeDisabled();

    await card().getByRole('button', { name: 'Next page' }).click();
    await expect(card().getByRole('link')).toHaveCount(2);
    await expect.element(card().getByRole('link', { name: 'example.com/link-12' })).toBeVisible();
    await expect.element(card().getByRole('button', { name: 'Next page' })).toBeDisabled();
  });

  it('keeps an email with few links as tall as one with none', async () => {
    prepare([email('First'), email('Second', unclicked)]);
    fakeAdminEndpoint('GET', linksPath(), { automation_action_links: links(1) });
    fakeAdminEndpoint('GET', linksPath('Second'), { automation_action_links: [] });
    await boot();
    await show();
    await show('Second');
    await expect(card().getByRole('link')).toHaveCount(1);
    await expect
      .element(card('Second').getByRole('status').getByText('No click data yet'))
      .toBeVisible();
    await expect.element(card().getByRole('button', { name: 'Next page' })).not.toBeInTheDocument();
    expect(height()).toBeGreaterThanOrEqual(height('Second'));
  });

  it('shows no click rate for an email without links', async () => {
    prepare([email('First', unclicked)]);
    const request = fakeAdminEndpoint('GET', linksPath(), { automation_action_links: [] });
    await boot();
    await expect.element(card().getByText('Clicked: —')).toBeInTheDocument();
    // Asked once on load to tell "no links" from "no clicks yet".
    expect(request.requests.length).toBeGreaterThan(0);
    await show();
    await expect.element(card().getByText('No click data yet')).toBeVisible();
    await expect.element(card().getByText('Unique clicks per link')).not.toBeInTheDocument();
  });

  it('honors open tracking turned off', async () => {
    prepare();
    fakeAdminEndpoint('GET', linksPath(), { automation_action_links: links(1) });
    await boot({ opens: false });
    await expect.element(card().getByText(`Opened: ${OFF}`)).toBeInTheDocument();
    await expect.element(card().getByText('Clicked: 20%, 20 members')).toBeInTheDocument();
    await show();
    await expect.element(card().getByText(`Opened: ${OFF}`)).toBeInTheDocument();
    await expect.element(card().getByRole('link', { name: 'example.com/link-1' })).toBeVisible();
  });

  it.each([
    { name: 'click tracking', opens: true },
    { name: 'open and click tracking', opens: false },
  ])('honors $name turned off without requesting links', async ({ opens }) => {
    prepare([email('First', unclicked)]);
    const request = fakeAdminEndpoint('GET', linksPath(), { automation_action_links: [] });
    await boot({ opens, clicks: false });
    await expect.element(card().getByText(`Clicked: ${OFF}`)).toBeInTheDocument();
    await expect
      .element(card().getByText(opens ? 'Opened: 75%, 75 members' : `Opened: ${OFF}`))
      .toBeInTheDocument();
    await show();
    await expect.element(card().getByText('Click tracking is off')).toBeVisible();
    expect(request.requests).toHaveLength(0);
  });

  it('does not request links before any email has been sent', async () => {
    prepare([email('First', unsent)]);
    const request = fakeAdminEndpoint('GET', linksPath(), { automation_action_links: [] });
    await boot();
    await show();
    await expect.element(card().getByText('No click data yet')).toBeVisible();
    expect(request.requests).toHaveLength(0);
  });

  it('supports retry and closing without changing the draft', async () => {
    prepare();
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
      .element(card('Draft subject').getByRole('alert'))
      .toHaveTextContent("Couldn't load clicked links.");
    const url =
      'https://example.com/a-very-long-path-that-needs-to-truncate-in-the-middle/final-destination';
    fakeAdminEndpoint('GET', linksPath(), {
      automation_action_links: [{ url, clicked_count: 10 }],
    });
    await card('Draft subject').getByRole('button', { name: 'Retry' }).click();
    const link = card('Draft subject').getByRole('link', { name: url.replace('https://', '') });
    await expect.element(link).toHaveAttribute('href', url);
    await expect.element(link).toBeVisible();
    await toggle('Draft subject').click();
    await expect
      .element(card('Draft subject').getByRole('textbox', { name: 'Subject line' }))
      .toHaveValue('Draft subject');
  });

  it('stays open beside the automation sidebar', async () => {
    await page.viewport(1600, 900);
    try {
      prepare();
      fakeAdminEndpoint('GET', linksPath(), { automation_action_links: links(1) });
      await boot();
      await show();
      await openAutomationSidebar();
      await expect.element(automationsScreen.hideAutomationSidebarButton()).toBeVisible();
      await expect.element(toggle()).toHaveAttribute('aria-pressed', 'true');
      await expect.element(card().getByRole('link', { name: 'example.com/link-1' })).toBeVisible();
    } finally {
      await page.viewport(1280, 800);
    }
  });

  it('hides the analytics toggle for emails without stats', async () => {
    prepare([{ ...email('First'), stats: undefined }]);
    await boot();
    await expect.element(card()).toBeVisible();
    await expect.element(toggle()).not.toBeInTheDocument();
  });

  it('keeps the workflow visible after saving with analytics open', async () => {
    prepare();
    fakeAdminEndpoint('GET', linksPath(), { automation_action_links: links(1) });
    const save = fakeAdminEndpoint('PUT', '/automations/first/', ({ body }) => ({
      automations: [
        {
          ...detail('first'),
          ...(body as { automations: Partial<AutomationDetail>[] }).automations[0],
        },
      ],
    }));
    await boot();
    await editingCanvas().getByRole('textbox', { name: 'Subject line' }).fill('Updated subject');
    await show('Updated subject');
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
      await expect.element(page.getByRole('button', { name: 'Save', exact: true })).toBeDisabled();
      await expect.element(card('Updated subject')).toBeVisible();
      expect(workflowDisappeared).toBe(false);
    } finally {
      observer.disconnect();
    }
  });

  it('dismisses the menu before the automation sidebar on Escape', async () => {
    prepare();
    fakeAdminEndpoint('GET', linksPath(), { automation_action_links: [] });
    await boot();
    await openAutomationSidebar();
    await page.getByRole('button', { name: 'Filter performance' }).click();
    await expect.element(page.getByRole('menu')).toBeVisible();
    await userEvent.keyboard('{Escape}');
    await expect.element(page.getByRole('menu')).not.toBeInTheDocument();
    await expect.element(automationsScreen.hideAutomationSidebarButton()).toBeVisible();
    await userEvent.keyboard('{Escape}');
    await expect.element(automationsScreen.showAutomationSidebarButton()).toBeVisible();
  });

  it.each(['subject', 'email body'])(
    'keeps the workflow visible after editing the %s and saving',
    async (field) => {
      prepare();
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
      await boot();
      const emailCard = editingCanvas().getByRole('article', { name: /^Send email/ });
      if (field === 'subject') {
        await emailCard.getByRole('textbox', { name: 'Subject line' }).fill('Updated subject');
      } else {
        await emailCard.getByRole('button', { name: 'Edit email content', exact: true }).click();
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
        await expect.element(emailCard).toBeVisible();
        await expect
          .element(
            page.getByRole('article', {
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
