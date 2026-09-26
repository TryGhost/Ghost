import { MigratePage } from '@/admin-pages';
import { expect, test } from '@/helpers/playwright';

const MIGRATION_APP_ORIGIN = 'https://migrate.ghost.org';

// Stands in for the migration app: asks Admin for its credentials, shows what
// it received, and can send Admin back to the migration settings.
const migrationAppStandIn = `<!doctype html><body>
  <pre id="initial-data"></pre>
  <button onclick="parent.postMessage({ route: '/settings/migration' }, '*')">Back to Ghost</button>
  <script>
    window.addEventListener('message', (event) => {
      if (event.data?.request === 'initialData') {
        document.getElementById('initial-data').textContent = JSON.stringify(event.data.response);
      }
    });
    parent.postMessage({ request: 'apiUrl' }, '*');
  </script>
</body>`;

interface IntegrationsResponse {
  integrations: Array<{ slug: string; api_keys: Array<{ secret: string }> }>;
}

for (const react of [false, true]) {
  test.describe(`Ghost Admin - Migration app handoff (${react ? 'React' : 'Ember'})`, () => {
    test.use({ labs: { iframeRoutesReact: react } });

    test('gives the migration app its credentials and follows it back to settings', async ({
      page,
      baseURL,
      ghostAccountOwner,
    }) => {
      const response = await page.request.get('/ghost/api/admin/integrations/', {
        params: { include: 'api_keys', limit: 'all' },
      });
      const { integrations } = (await response.json()) as IntegrationsResponse;
      const migrationKey = integrations.find(({ slug }) => slug === 'self-serve-migration')
        ?.api_keys[0].secret;
      await page.route(
        (url) => url.origin === MIGRATION_APP_ORIGIN,
        (route) => route.fulfill({ contentType: 'text/html', body: migrationAppStandIn }),
      );

      const migratePage = new MigratePage(page);
      await migratePage.goto('/ghost/#/migrate/substack');

      const initialData = migratePage.migrationApp.locator('#initial-data');
      await expect(initialData).not.toBeEmpty();
      await expect(migratePage.closeButton).toBeVisible({ visible: react });
      expect(JSON.parse((await initialData.textContent()) ?? '')).toEqual({
        apiUrl: `${new URL(baseURL ?? '').origin}/ghost`,
        apiKey: migrationKey,
        stripe: false,
        csvContentImporter: false,
        ghostVersion: expect.stringMatching(/^\d+\.\d+$/),
        ownerEmail: ghostAccountOwner.email,
      });

      await migratePage.migrationApp.getByRole('button', { name: 'Back to Ghost' }).click();

      await expect(page).toHaveURL(/\/ghost\/#\/settings\/migration\/?$/);
      await expect(migratePage.migrationAppFrame).toBeHidden();
    });
  });
}
