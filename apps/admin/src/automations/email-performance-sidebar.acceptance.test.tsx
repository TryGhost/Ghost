import { describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { fakeAdminEndpoint, renderAdminApp } from '@test-utils/acceptance';
import { settingsResponse } from '@tryghost/test-data';
import type {
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
const email = (
  id: string,
  metrics: AutomationEmailStats | undefined = stats,
): AutomationSendEmailAction => ({
  id,
  type: 'send_email',
  stats: metrics,
  data: {
    email_subject: id,
    email_lexical: JSON.stringify({
      root: { children: [{ type: 'paragraph', children: [{ type: 'text', text: 'Welcome' }] }] },
    }),
    email_design_setting_id: 'design',
  },
});
const prepare = (
  actions = [email('First'), email('Second', { ...stats, email_sent_count: 200 })],
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
    labs: { automations: true, automationRunAnalytics: redesigned, automationAnalytics: true },
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

  it('animates both opening and closing while moving the workflow with the panel', async () => {
    prepare();
    fakeAdminEndpoint('GET', linksPath(), { automation_action_links: [] });
    await boot();
    await expect.element(card()).toBeVisible();
    const sidebar = document.querySelector<HTMLElement>('[aria-label="Email performance"]')!;
    const samples: { width: number; canvasWidth: number; contentWidth: number }[] = [];
    let frame = 0;
    const sample = () => {
      samples.push({
        width: sidebar.getBoundingClientRect().width,
        canvasWidth: editingCanvas().element().getBoundingClientRect().width,
        contentWidth: sidebar.firstElementChild?.getBoundingClientRect().width ?? 0,
      });
      frame = requestAnimationFrame(sample);
    };
    const checkMotion = async (action: () => Promise<unknown>, finalWidth: number) => {
      samples.length = 0;
      frame = requestAnimationFrame(sample);
      try {
        await action();
        await expect.poll(() => sidebar.getBoundingClientRect().width).toBe(finalWidth);
        const intermediate = samples.filter(({ width }) => width > 5 && width < 395);
        expect(intermediate.length).toBeGreaterThan(1);
        for (const { width, canvasWidth, contentWidth } of intermediate) {
          expect(width + canvasWidth).toBeCloseTo(1280, 0);
          // The chart and text keep their layout as the panel reveals/clips them.
          expect(contentWidth).toBe(400);
        }
      } finally {
        cancelAnimationFrame(frame);
      }
    };
    await checkMotion(() => show(), 400);
    await checkMotion(
      () => panel().getByRole('button', { name: 'Close email performance' }).click(),
      0,
    );
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

  it('supports retry, middle-truncated links without tooltips, and closing without changing the draft', async () => {
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
    expect(link.element().querySelector('.truncate')).not.toBeNull();
    expect(link.element().hasAttribute('title')).toBe(false);
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
    await expect.element(panel()).not.toBeInTheDocument();
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

  it('shows unavailable rather than zero totals when the backend supplies no stats', async () => {
    const action = email('First');
    delete action.stats;
    prepare([action]);
    await boot();
    await show();
    await expect.element(panel().getByText('Email performance is unavailable.')).toBeVisible();
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
});
