import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';

import {
  configResponse,
  currentRoute,
  defaultThemesResponse,
  fakeAdminEndpoint,
  fakeAdminStats,
  fakeFrameOrigin,
  fakeSettingsScreens,
  fakeSitePreview,
  fakeThemes,
  renderAdminApp,
  siteResponse,
} from '@test-utils/acceptance';
import { settingsScreen } from '@/settings/settings.screen';

// Previewing an installed theme that isn't active, in the Design settings
// (behind the themePreview labs flag): Edition is active, Casper is installed.

const previewHtml = '<html><head><style></style></head><body>preview</body></html>';

const casperSettings = [
  {
    id: 'casper-feed-layout',
    key: 'feed_layout',
    type: 'select',
    options: ['Classic', 'Grid', 'List'],
    default: 'Classic',
    value: 'Classic',
  },
  {
    id: 'casper-color-scheme',
    key: 'color_scheme',
    type: 'select',
    options: ['Light', 'Dark'],
    default: 'Light',
    value: 'Light',
  },
];

function siteUrl(): string {
  const url = siteResponse().site.url;
  if (typeof url !== 'string') {
    throw new Error('Site fixture requires a URL');
  }
  return url;
}

/** The Design settings, on a server that can (or, older, can't) preview themes */
function fakePreviewWorld({
  serverSupportsPreviews = true,
  casperPresets,
}: {
  serverSupportsPreviews?: boolean;
  /** Presets Casper declares in its package.json */
  casperPresets?: Record<string, Record<string, string | boolean>>;
} = {}) {
  fakeSettingsScreens();
  const themes = defaultThemesResponse().themes;
  if (casperPresets) {
    const casper = themes.find(({ name }) => name === 'casper')!;
    (casper.package as Record<string, unknown>).config = { presets: casperPresets };
  }
  fakeThemes(themes);
  fakeAdminEndpoint('GET', '/custom_theme_settings/', { custom_theme_settings: [] });
  fakeAdminEndpoint('GET', /^\/posts\/.+limit=1/, { posts: [] });
  const preview = fakeSitePreview(siteUrl(), previewHtml);

  const config = configResponse({ labs: { themePreview: true } });
  if (serverSupportsPreviews) {
    (config.config as Record<string, unknown>).themePreview = true;
  }

  const options = { labs: { themePreview: true }, boot: { browseConfig: { response: config } } };
  return {
    preview,
    config,
    render: (route = '/settings/design/edit?tab=theme') => renderAdminApp(route, options),
  };
}

function fakeCasperPreview() {
  const settingsApi = fakeAdminEndpoint('GET', /^\/custom_theme_settings\/\?theme=casper/, {
    custom_theme_settings: casperSettings,
  });
  const tokenApi = fakeAdminEndpoint('GET', '/themes/casper/preview-token/', {
    theme_previews: [
      { theme: 'casper', token: 'preview.token', expires_at: '2099-01-01T00:00:00.000Z' },
    ],
  });
  return { settingsApi, tokenApi };
}

async function pickTheme(name: RegExp) {
  const modal = settingsScreen.designModal();
  await modal.getByLabelText('Preview and customize').click();
  await page.getByRole('option', { name }).click();
  return modal;
}

describe('Theme previews in the Design settings', () => {
  it("offers no theme picker when the server can't preview themes, even with the flag on", async () => {
    const world = fakePreviewWorld({ serverSupportsPreviews: false });
    await world.render();

    const modal = settingsScreen.designModal();
    await expect.element(modal.getByRole('heading', { name: 'Design' })).toBeVisible();
    await expect(modal.getByLabelText('Preview and customize')).toHaveCount(0);
  });

  it('previews another theme with its own settings, without changing the site', async () => {
    const world = fakePreviewWorld();
    const { settingsApi, tokenApi } = fakeCasperPreview();
    await world.render();

    const modal = await pickTheme(/Casper/);

    await expect.poll(currentRoute).toContain('theme=casper');
    await expect.poll(() => settingsApi.requests.length).toBeGreaterThan(0);
    await expect.poll(() => tokenApi.requests.length).toBeGreaterThan(0);
    await expect
      .poll(() =>
        world.preview.requests.some(({ preview }) => preview.includes('theme_token=preview.token')),
      )
      .toBe(true);
    await expect.element(modal.getByLabelText('Feed layout')).toBeVisible();
    await expect.element(modal.getByRole('button', { name: 'Activate Casper' })).toBeVisible();
  });

  it('activates the previewed theme with the settings changed in the preview, in one request', async () => {
    const world = fakePreviewWorld();
    fakeCasperPreview();
    const casper = defaultThemesResponse().themes.find(({ name }) => name === 'casper')!;
    const activateApi = fakeAdminEndpoint('PUT', '/themes/casper/activate/', {
      themes: [{ ...casper, active: true }],
    });
    await world.render();

    const modal = await pickTheme(/Casper/);
    await modal.getByLabelText('Feed layout').click();
    await page.getByRole('option', { name: 'Grid' }).click();
    await modal.getByRole('button', { name: 'Activate Casper' }).click();
    await page
      .getByTestId('activate-theme-dialog')
      .getByRole('button', { name: 'Activate Casper' })
      .click();

    await expect.poll(() => activateApi.requests.length).toBe(1);
    expect(activateApi.requests[0].body).toEqual({
      custom_theme_settings: [{ key: 'feed_layout', value: 'Grid' }],
    });
    await expect
      .element(settingsScreen.successToast())
      .toHaveTextContent(/Casper is now your active theme/);
  });

  it('asks before leaving a preview, saying the site keeps its theme', async () => {
    const world = fakePreviewWorld();
    fakeCasperPreview();
    await world.render();

    const modal = await pickTheme(/Casper/);
    await expect.element(modal.getByRole('button', { name: 'Activate Casper' })).toBeVisible();
    await modal.getByRole('button', { name: 'Close' }).click();

    await expect
      .element(page.getByRole('alertdialog'))
      .toHaveTextContent(/Leave the preview of Casper\?.*Your site keeps Edition/);
  });

  it("says so when a link names a theme that can't be previewed, and shows the site's own", async () => {
    const world = fakePreviewWorld();
    await world.render('/settings/design/edit?tab=theme&theme=nope');

    await expect.element(page.getByText(`"nope" can't be previewed`)).toBeVisible();
    await expect.poll(currentRoute).not.toContain('theme=nope');
    await expect
      .element(settingsScreen.designModal().getByRole('button', { name: 'Save' }))
      .toBeVisible();
  });

  it('applies a preset a link carries once, and keeps a preset chosen after it', async () => {
    const world = fakePreviewWorld({
      casperPresets: {
        Classic: { feed_layout: 'Classic', color_scheme: 'Light' },
        'Dark grid': { feed_layout: 'Grid', color_scheme: 'Dark' },
      },
    });
    fakeCasperPreview();
    await world.render('/settings/design/edit?tab=theme&theme=casper&preset=dark-grid');

    const modal = settingsScreen.designModal();
    await expect.element(modal.getByLabelText('Preset')).toHaveTextContent('Dark grid');
    await expect.element(modal.getByLabelText('Feed layout')).toHaveTextContent('Grid');
    await expect.poll(currentRoute).not.toContain('preset=');

    await modal.getByLabelText('Preset').click();
    await page.getByRole('option', { name: 'Classic' }).click();
    await expect.element(modal.getByLabelText('Feed layout')).toHaveTextContent('Classic');
    await expect.element(modal.getByLabelText('Color scheme')).toHaveTextContent('Light');
    // Still Classic a moment later: the link's preset isn't applied again
    await new Promise((resolve) => {
      setTimeout(resolve, 300);
    });
    await expect.element(modal.getByLabelText('Preset')).toHaveTextContent('Classic');
  });

  it('previews an installed theme from Themes, and closing the preview goes back one step at a time', async () => {
    const world = fakePreviewWorld();
    fakeCasperPreview();
    await world.render('/settings/design/change-theme?from=design');

    const themesModal = settingsScreen.themeModal();
    await themesModal.getByRole('tab', { name: 'Installed' }).click();
    await themesModal.getByTestId('theme-preview-button').first().click();
    await expect
      .poll(currentRoute)
      .toBe(
        '/settings/design/edit?tab=theme&theme=casper&from=themes&themes_view=installed&themes_from=design',
      );
    const modal = settingsScreen.designModal();
    await expect.element(modal.getByRole('button', { name: 'Activate Casper' })).toBeVisible();

    // The preview closes back to Themes, on the tab it was opened from...
    await modal.getByRole('button', { name: 'Close' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Leave' }).click();
    await expect
      .poll(currentRoute)
      .toBe('/settings/design/change-theme?view=installed&from=design');
    await expect
      .element(settingsScreen.themeModal().getByRole('tab', { name: 'Installed' }))
      .toHaveAttribute('aria-selected', 'true');

    // ...and Themes, back to the Design settings it was opened from
    await settingsScreen.themeModal().getByRole('button', { name: 'Close' }).click();
    await expect.poll(currentRoute).toBe('/settings/design/edit?tab=theme');
  });

  it('closes Themes back to the Design settings it was opened from', async () => {
    const world = fakePreviewWorld();
    await world.render('/settings/design/change-theme?from=design');

    await settingsScreen.themeModal().getByRole('button', { name: 'Close' }).click();
    await expect.poll(currentRoute).toBe('/settings/design/edit?tab=theme');
  });

  it("customizes the active theme from the Themes section's menu", async () => {
    const world = fakePreviewWorld();
    await world.render('/settings/theme');

    await page.getByTestId('theme').getByRole('button', { name: 'Menu' }).click();
    await page.getByRole('menuitem', { name: 'Customize' }).click();
    await expect.poll(currentRoute).toBe('/settings/design/edit?tab=theme');
  });

  it("previews an official theme from its demo page, once it's installed", async () => {
    const world = fakePreviewWorld();
    fakeCasperPreview();
    await world.render('/settings/design/change-theme');

    const themesModal = settingsScreen.themeModal();
    await themesModal.getByRole('button', { name: /Casper/ }).click();
    await expect.element(themesModal.getByText('Installed · v')).toBeVisible();
    await themesModal.getByRole('button', { name: 'Preview Casper' }).click();
    await expect
      .poll(currentRoute)
      .toBe('/settings/design/edit?tab=theme&theme=casper&from=themes&themes_view=Casper');

    // Closing the preview goes back to Casper's page in Themes
    const modal = settingsScreen.designModal();
    await expect.element(modal.getByRole('button', { name: 'Activate Casper' })).toBeVisible();
    await modal.getByRole('button', { name: 'Close' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Leave' }).click();
    await expect.poll(currentRoute).toBe('/settings/design/change-theme?view=Casper');
    await expect
      .element(settingsScreen.themeModal().getByRole('button', { name: 'Preview Casper' }))
      .toBeVisible();
  });

  it("previews from Themes back in View site's Customize panel, when opened from there", async () => {
    const world = fakePreviewWorld();
    fakeCasperPreview();
    await world.render('/settings/design/change-theme?from=customize');

    const themesModal = settingsScreen.themeModal();
    await themesModal.getByRole('tab', { name: 'Installed' }).click();
    await themesModal.getByTestId('theme-preview-button').first().click();
    await expect.poll(currentRoute).toBe('/site?customize&tab=theme&theme=casper');
  });

  it("offers the same picker and activation in View site's Customize panel", async () => {
    const world = fakePreviewWorld();
    fakeCasperPreview();
    const siteOrigin = new URL(siteUrl()).origin;
    await fakeFrameOrigin(siteOrigin, '<!doctype html>');
    fakeAdminStats.memberCount();
    fakeAdminStats.mrr();
    await renderAdminApp('/site?customize&tab=theme&theme=casper', {
      labs: { themePreview: true, admin7Design: true, admin7CustomizeFromViewSite: true },
      boot: { browseConfig: { response: world.config } },
    });

    const panel = page.getByRole('complementary', { name: 'Design' });
    await expect.element(panel.getByLabelText('Preview and customize')).toHaveTextContent('Casper');
    await expect.element(panel.getByRole('button', { name: 'Activate Casper' })).toBeVisible();
    await expect
      .poll(() =>
        world.preview.requests.some(({ preview }) => preview.includes('theme_token=preview.token')),
      )
      .toBe(true);
  });
});
