import { IntegrationsSection } from '@/admin-pages';
import { expect, test } from '@/helpers/playwright';

test.describe('Ghost Admin - Settings section links', () => {
  // A fresh page load, as when the link is opened in a new tab. Integrations
  // sits far enough down that it is out of view unless the page scrolls to it.
  test('opening a settings section link scrolls to that section', async ({ page }) => {
    const integrationsSection = new IntegrationsSection(page);

    await integrationsSection.goto();

    await expect(integrationsSection.integrationsHeading).toBeInViewport();
  });
});
