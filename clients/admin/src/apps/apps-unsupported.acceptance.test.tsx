import { beforeEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import type { AppInstallation } from '@tryghost/admin-x-framework/api/app-installations';
import {
  configResponse,
  currentRoute,
  fakeAdminEndpoint,
  renderAdminApp,
} from '@test-utils/acceptance';
import { appsScreen } from './apps.screen';
import { MANIFEST_URL, fakeInstallations, installation, labs, readPath } from './apps.test-utils';

const DETAILS_ROUTE = '/apps/details/installation-1';
const INSTALL_ROUTE = `/apps/install?manifest=${encodeURIComponent(MANIFEST_URL)}`;

/** Admin on a site that runs the legacy auth engine, where Ghost can't issue apps their tokens. */
function renderOnLegacyEngine(route: string) {
  const config = configResponse({ labs });
  config.config.auth = { engine: 'legacy' };
  return renderAdminApp(route, { labs, boot: { browseConfig: { response: config } } });
}

const notice = () => page.getByTestId('apps-need-new-auth-engine');

/**
 * Admin while the site's config is still on its way, which says which auth engine the site runs.
 * `arrive` lets it through.
 */
function renderBeforeConfigLoads(route: string, engine: 'legacy' | 'better-auth') {
  let arrive!: () => void;
  const arrived = new Promise<void>((resolve) => {
    arrive = resolve;
  });
  const config = configResponse({ labs });
  config.config.auth = { engine };
  const rendered = renderAdminApp(route, {
    labs,
    boot: {
      browseConfig: {
        response: async () => {
          await arrived;
          return config;
        },
      },
    },
  });
  return { rendered, arrive };
}

const fakeDetails = (app: AppInstallation) =>
  fakeAdminEndpoint('GET', readPath(app.id), { app_installations: [{ ...app, history: [] }] });

// Apps call Ghost with tokens only its new auth engine issues. Ghost refuses to preview, install,
// approve or open an app on any other, so Admin offers none of those there.
describe('Apps on a site that doesn’t run the new auth engine', () => {
  beforeEach(() => {
    fakeInstallations();
  });

  it('says apps aren’t available, in place of an empty list', async () => {
    await renderOnLegacyEngine('/apps');

    await expect.element(notice()).toHaveTextContent('Apps aren’t available on this site');
    await expect.element(notice()).toHaveTextContent('Apps need Ghost’s new auth engine');
    await expect.element(appsScreen.emptyState()).not.toBeInTheDocument();
  });

  it('shows the same message for an install link, and asks Ghost for nothing', async () => {
    const previewApi = fakeAdminEndpoint('POST', '/apps/installations/preview/', {});

    await renderOnLegacyEngine(INSTALL_ROUTE);

    await expect.element(notice()).toHaveTextContent('Apps aren’t available on this site');
    await expect.element(appsScreen.installDialog()).not.toBeInTheDocument();
    expect(previewApi.requests).toHaveLength(0);
  });

  it('lists an app installed earlier with nothing that opens it, and still uninstalls it', async () => {
    const installed = installation();
    const installations = fakeInstallations([installed]);
    fakeDetails(installed);
    const uninstallApi = fakeAdminEndpoint('DELETE', '/apps/installations/installation-1/', () => {
      installations.set([]);
      return new Response(null, { status: 204 });
    });

    await renderOnLegacyEngine('/apps');

    await expect.element(notice()).toHaveTextContent('Apps aren’t available on this site');
    await expect.element(appsScreen.row('Podcast')).toBeVisible();
    // The sidebar keeps its way to this page, and lists no app to open.
    await expect.element(appsScreen.sidebarLink()).toBeVisible();
    await expect(appsScreen.sidebarAppItems()).toHaveCount(0);
    // Pinning would put a link that opens the app in the sidebar.
    await appsScreen.rowActions('Podcast').click();
    await expect.element(appsScreen.menuItem('Uninstall')).toBeVisible();
    await expect.element(appsScreen.menuItem('Pin to sidebar')).not.toBeInTheDocument();
    await appsScreen.menuItem('Uninstall').click();
    await appsScreen.uninstallDialog().getByRole('button', { name: 'Uninstall' }).click();

    await expect.element(page.getByText('Podcast uninstalled')).toBeVisible();
    await expect(appsScreen.rows()).toHaveCount(0);
    expect(uninstallApi.requests).toHaveLength(1);
  });

  it('leads from the list to an app’s details, which offer only uninstalling', async () => {
    const installed = installation();
    fakeInstallations([installed]);
    fakeDetails(installed);

    await renderOnLegacyEngine('/apps');
    await appsScreen.row('Podcast').getByText('Publish episodes and embed players.').click();

    await expect.poll(currentRoute).toBe(DETAILS_ROUTE);
    await expect.element(appsScreen.details()).toBeVisible();
    await expect.element(notice()).toHaveTextContent('Apps need Ghost’s new auth engine');
    await expect.element(page.getByRole('link', { name: 'Open' })).not.toBeInTheDocument();
    await appsScreen.detailsActions().click();
    await expect.element(appsScreen.menuItem('Uninstall')).toBeVisible();
    await expect.element(appsScreen.menuItem('Pin to sidebar')).not.toBeInTheDocument();
  });

  it('offers no review of an app that was waiting for approval', async () => {
    const suspended = installation({ status: 'suspended' });
    fakeInstallations([suspended]);
    fakeDetails(suspended);

    await renderOnLegacyEngine('/apps');

    await expect.element(appsScreen.row('Podcast')).toBeVisible();
    await expect
      .element(page.getByRole('link', { name: 'Review changes' }))
      .not.toBeInTheDocument();

    await renderOnLegacyEngine(DETAILS_ROUTE);
    await expect.element(appsScreen.details()).toBeVisible();
    await expect
      .element(page.getByRole('link', { name: 'Review changes' }))
      .not.toBeInTheDocument();
  });

  // Until the config loads, Admin knows neither that apps can be used here nor that they can't,
  // so it shows neither: nothing that says they can't, and nothing that opens one.
  describe('while the site’s config is loading', () => {
    // Long enough for Admin to have been answered everything else it asks for on the way to
    // the screen, the installed apps included
    const pending = async (route: string, engine: 'legacy' | 'better-auth') => {
      const { rendered, arrive } = renderBeforeConfigLoads(route, engine);
      await new Promise((resolve) => {
        setTimeout(resolve, 500);
      });
      return { rendered, arrive };
    };

    beforeEach(() => {
      fakeInstallations([installation()]);
      fakeDetails(installation());
    });

    it('says nothing about apps being unavailable, then lists them to open where they are', async () => {
      const { rendered, arrive } = await pending('/apps', 'better-auth');

      await expect.element(notice()).not.toBeInTheDocument();
      await expect.element(appsScreen.emptyState()).not.toBeInTheDocument();
      await expect(appsScreen.rows()).toHaveCount(0);
      await expect(appsScreen.sidebarAppItems()).toHaveCount(0);

      arrive();
      await rendered;
      await expect.element(appsScreen.row('Podcast')).toBeVisible();
      await expect.element(notice()).not.toBeInTheDocument();
      await expect
        .element(appsScreen.row('Podcast').getByRole('link', { name: 'Podcast' }))
        .toHaveAttribute('href', '#/apps/installation-1');
    });

    it('lists no app to open, then says apps aren’t available where they aren’t', async () => {
      const { rendered, arrive } = await pending('/apps', 'legacy');

      await expect.element(notice()).not.toBeInTheDocument();
      await expect(appsScreen.rows()).toHaveCount(0);
      await expect(appsScreen.sidebarAppItems()).toHaveCount(0);

      arrive();
      await rendered;
      await expect.element(notice()).toHaveTextContent('Apps aren’t available on this site');
      await expect.element(appsScreen.row('Podcast')).toBeVisible();
      await expect(appsScreen.sidebarAppItems()).toHaveCount(0);
    });

    it('holds an app’s details and their actions back, so none appears after the page does', async () => {
      const { rendered, arrive } = await pending(DETAILS_ROUTE, 'better-auth');

      await expect.element(notice()).not.toBeInTheDocument();
      await expect.element(page.getByRole('link', { name: 'Open' })).not.toBeInTheDocument();
      await expect.element(appsScreen.detailsActions()).not.toBeInTheDocument();

      arrive();
      await rendered;
      await expect.element(page.getByRole('link', { name: 'Open' })).toBeVisible();
      await expect.element(appsScreen.detailsActions()).toBeVisible();
      await expect.element(notice()).not.toBeInTheDocument();
    });

    it('opens no install dialog until it knows the app can be installed', async () => {
      const previewApi = fakeAdminEndpoint('POST', '/apps/installations/preview/', {});
      const { rendered, arrive } = await pending(INSTALL_ROUTE, 'legacy');

      await expect.element(appsScreen.installDialog()).not.toBeInTheDocument();
      await expect.element(notice()).not.toBeInTheDocument();

      arrive();
      await rendered;
      await expect.element(notice()).toHaveTextContent('Apps aren’t available on this site');
      await expect.element(appsScreen.installDialog()).not.toBeInTheDocument();
      expect(previewApi.requests).toHaveLength(0);
    });
  });
});
