import { IntegrationModal } from '@/admin-pages';
import { expect, test } from '@/helpers/playwright';

test.describe('Ghost Admin - Integrations', () => {
  test('transistor enabled state persists after page reload', async ({ page }) => {
    const transistor = new IntegrationModal(page, 'transistor');

    await transistor.goto();
    await transistor.openModal();
    await transistor.enable();
    await transistor.save();
    await transistor.closeModal();

    await page.reload();
    await transistor.integrationsSection.waitFor({ state: 'visible' });

    await transistor.openModal();

    await expect(transistor.enableToggle).toHaveAttribute('aria-checked', 'true');
  });
});
