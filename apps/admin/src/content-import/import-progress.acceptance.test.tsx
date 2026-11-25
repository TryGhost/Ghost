import { afterEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { getGhostPaths } from '@tryghost/admin-x-framework/helpers';
import {
  configResponse,
  currentRoute,
  currentUserResponse,
  fakeAdminEndpoint,
  fakeSettingsScreens,
  fakeTags,
  renderAdminApp,
} from '@test-utils/acceptance';
import { settingsScreen } from '@/settings/settings.screen';
import { sidebarScreen } from '@/layout/sidebar.screen';

const id = 'abcdefabcdefabcdefabcdef';
const progressPath = `/posts/upload/${id}/progress/`;
const storageKey = () =>
  `ghost:csv-imports:${getGhostPaths().adminRoot}:${String(currentUserResponse().users[0].id)}`;
const sidebarProgress = () =>
  sidebarScreen.shellNav().getByRole('link', { name: /Import progress/ });

afterEach(() => {
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith('ghost:csv-imports:')) {
      localStorage.removeItem(key);
    }
  }
});

describe('CSV import progress', () => {
  it.each(['light', 'dark'] as const)(
    'confirms stopping an import and hides both indicators in %s mode',
    async (theme) => {
      fakeSettingsScreens();
      fakeTags([]);
      const config = configResponse();
      config.config.contentImport = { cancellation: true };
      const me = currentUserResponse();
      me.users[0].accessibility = JSON.stringify({ nightShift: theme });
      localStorage.setItem(storageKey(), JSON.stringify([id]));
      let status = 'running';
      fakeAdminEndpoint('GET', progressPath, () => ({
        meta: { import_id: id, status, processed: 62, total: 100 },
      }));
      const cancellation = fakeAdminEndpoint('POST', `/posts/upload/${id}/cancel/`, () => {
        status = 'cancelling';
        return Response.json({ meta: { import_id: id, status } }, { status: 202 });
      });
      await renderAdminApp('/tags', {
        labs: { csvContentImporter: true },
        boot: { browseConfig: { response: config }, browseMe: { response: me } },
      });
      await sidebarProgress().click();
      const section = settingsScreen.section('migrationtools');
      await expect.element(section.getByRole('button', { name: 'Stop import' })).toBeVisible();
      await section.getByRole('button', { name: 'Stop import' }).click();
      const modal = settingsScreen.confirmationModal();
      await expect.element(modal.getByRole('heading', { name: 'Stop this import?' })).toBeVisible();
      await expect
        .element(modal.getByText(/Already imported posts and pages will be kept/))
        .toBeVisible();
      await modal.getByRole('button', { name: 'Keep importing' }).click();
      await expect(modal).toHaveCount(0);
      expect(cancellation.requests).toHaveLength(0);
      await section.getByRole('button', { name: 'Stop import' }).click();
      await settingsScreen.confirmationModal().getByRole('button', { name: 'Stop import' }).click();
      await expect.element(section.getByText('Stopping…', { exact: true })).toBeVisible();
      await expect(section.getByRole('button', { name: 'Stop import' })).toHaveCount(0);
      expect(cancellation.requests).toHaveLength(1);
      await expect.element(section.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '62');
      window.history.back();
      await expect.element(sidebarProgress()).toHaveTextContent('Stopping…');
      window.history.forward();
      await expect.element(section.getByText('Stopping…', { exact: true })).toBeVisible();
      status = 'cancelled';
      await expect.poll(() => localStorage.getItem(storageKey()), { timeout: 10000 }).toBeNull();
      await expect(section.getByRole('progressbar')).toHaveCount(0);
      window.history.back();
      await expect.element(sidebarScreen.shellNav()).toBeVisible();
      await expect(sidebarProgress()).toHaveCount(0);
    },
    30000,
  );

  it('keeps cancellation hidden on older Core and shows independent import cards', async () => {
    fakeSettingsScreens();
    const otherId = '123456789012345678901234';
    localStorage.setItem(storageKey(), JSON.stringify([id, otherId]));
    const config = configResponse();
    config.config.contentImport = { stagedInspection: true };
    for (const importId of [id, otherId]) {
      fakeAdminEndpoint('GET', `/posts/upload/${importId}/progress/`, {
        meta: { import_id: importId, status: 'running', processed: 1, total: 5 },
      });
    }
    await renderAdminApp('/settings/migration', {
      labs: { csvContentImporter: true },
      boot: { browseConfig: { response: config } },
    });
    const section = settingsScreen.section('migrationtools');
    await expect(section.getByRole('progressbar')).toHaveCount(2);
    await expect(section.getByRole('button', { name: 'Stop import' })).toHaveCount(0);
  });

  it.each([409, 500])(
    'handles a %s cancellation response and refreshes progress',
    async (responseStatus) => {
      fakeSettingsScreens();
      const config = configResponse();
      config.config.contentImport = { cancellation: true };
      localStorage.setItem(storageKey(), JSON.stringify([id]));
      let status = 'running';
      const progress = fakeAdminEndpoint('GET', progressPath, () => ({
        meta: { import_id: id, status, processed: 62, total: 100 },
      }));
      fakeAdminEndpoint('POST', `/posts/upload/${id}/cancel/`, () => {
        if (responseStatus === 409) {
          status = 'finalizing';
        }
        return Response.json(
          { errors: [{ message: 'Cannot stop this import', type: 'InternalServerError' }] },
          { status: responseStatus },
        );
      });
      await renderAdminApp('/settings/migration', {
        labs: { csvContentImporter: true },
        boot: { browseConfig: { response: config } },
      });
      const section = settingsScreen.section('migrationtools');
      await section.getByRole('button', { name: 'Stop import' }).click();
      const polls = progress.requests.length;
      await settingsScreen.confirmationModal().getByRole('button', { name: 'Stop import' }).click();
      await expect.poll(() => progress.requests.length).toBeGreaterThan(polls);
      await expect(section.getByText('Stopping…', { exact: true })).toHaveCount(0);
      if (responseStatus === 409) {
        await expect
          .element(page.getByText('This import has already finished processing.'))
          .toBeVisible();
        await expect.element(section.getByText('Finishing…')).toBeVisible();
      } else {
        await expect.element(page.getByText('Cannot stop this import')).toBeVisible();
        await expect
          .element(settingsScreen.confirmationModal().getByRole('button', { name: 'Stop import' }))
          .toBeEnabled();
      }
    },
  );

  it.each(['complete', 'failed', 'cancelled'])(
    'restores progress and hides both indicators when %s',
    async (outcome) => {
      fakeTags([]);
      fakeSettingsScreens();
      localStorage.setItem(storageKey(), JSON.stringify([id]));
      let status = 'running';
      let processed = 62;
      fakeAdminEndpoint('GET', progressPath, () => ({
        meta: { import_id: id, status, processed, total: 100 },
      }));
      await renderAdminApp('/tags', { labs: { csvContentImporter: true } });
      await expect.element(sidebarProgress()).toHaveTextContent('62%');
      await sidebarProgress().click();
      await expect.poll(currentRoute).toBe('/settings/migration');
      const section = settingsScreen.section('migrationtools');
      await expect
        .element(section.getByRole('heading', { name: 'Import progress', exact: true }))
        .toBeVisible();
      await expect.element(section.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '62');
      await expect.element(section.getByText(/You can leave this page/)).toBeVisible();
      status = 'finalizing';
      processed = 100;
      await expect.element(section.getByText('Finishing…'), { timeout: 10000 }).toBeVisible();
      status = outcome;
      await expect.poll(() => localStorage.getItem(storageKey()), { timeout: 10000 }).toBeNull();
      await expect(section.getByRole('progressbar')).toHaveCount(0);
      await expect(section.getByRole('heading', { name: 'Import progress' })).toHaveCount(0);
      window.history.back();
      await expect.poll(currentRoute).toBe('/tags');
      await expect(sidebarProgress()).toHaveCount(0);
      window.history.forward();
      await expect.poll(currentRoute).toBe('/settings/migration');
      await expect(section.getByRole('progressbar')).toHaveCount(0);
      await expect(section.getByRole('button', { name: 'Dismiss import result' })).toHaveCount(0);
    },
    30000,
  );

  it.each([true, false])(
    'starts tracking the submitted CSV and supports older Core (progress available: %s)',
    async (available) => {
      fakeSettingsScreens();
      const config = configResponse();
      config.config.contentImport = { stagedInspection: true };
      fakeAdminEndpoint('POST', '/posts/upload/inspect/', {
        meta: { upload_id: id, columns: ['title'], rows: [{ title: 'Example' }], total: 100 },
      });
      fakeAdminEndpoint('POST', '/posts/upload/', { meta: { import_id: id } }, { status: 202 });
      const progress = fakeAdminEndpoint(
        'GET',
        progressPath,
        available
          ? { meta: { import_id: id, status: 'running', processed: 62, total: 100 } }
          : { errors: [{ message: 'Not found', type: 'NotFoundError' }] },
        { status: available ? 200 : 404 },
      );
      await renderAdminApp('/settings/migration', {
        labs: { csvContentImporter: true },
        boot: { browseConfig: { response: config } },
      });
      const section = settingsScreen.section('migrationtools');
      await section.getByRole('button', { name: 'Universal import' }).click();
      const modal = page.getByTestId('universal-import-modal');
      const input = modal.element().querySelector<HTMLInputElement>('#import-file');
      if (!input) {
        throw new Error('Import file input was not rendered');
      }
      await page
        .elementLocator(input)
        .upload(new File(['title\nExample'], 'posts.csv', { type: 'text/csv' }));
      await modal.getByRole('button', { name: 'Import 100 items' }).click();
      await settingsScreen.confirmationModal().getByRole('button', { name: 'Got it' }).click();
      await expect.poll(() => progress.requests.length).toBe(1);
      if (available) {
        await expect.element(section.getByText('62%', { exact: true })).toBeVisible();
        expect(JSON.parse(localStorage.getItem(storageKey())!)).toEqual([id]);
      } else {
        await expect.poll(() => localStorage.getItem(storageKey())).toBeNull();
        await expect(section.getByRole('progressbar')).toHaveCount(0);
        await expect(sidebarProgress()).toHaveCount(0);
        await expect(page.getByText('Something went wrong, please try again.')).toHaveCount(0);
      }
    },
  );

  it('keeps the new UI hidden when the CSV Labs flag is disabled', async () => {
    fakeTags([]);
    localStorage.setItem(storageKey(), JSON.stringify([id]));
    const progress = fakeAdminEndpoint('GET', progressPath, {});
    await renderAdminApp('/tags');
    await expect.element(sidebarScreen.shellNav()).toBeVisible();
    await expect(sidebarProgress()).toHaveCount(0);
    expect(progress.requests).toHaveLength(0);
  });
});
