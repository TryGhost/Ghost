import { PortalAccountHomePage, PortalAccountProfilePage } from '@/portal-pages';
import { SettingsPage } from '@/admin-pages';
import { createMemberFactory } from '@/data-factory';
import { expect, test } from '@/helpers/playwright';
import { signInAsMember } from '@/helpers/playwright/flows/sign-in';
import { usePerTestIsolation } from '@/helpers/playwright/isolation';

usePerTestIsolation();

test.describe('Portal - member custom fields', () => {
  test.use({ labs: { membersCustomFields: true } });

  // An address is drawn as several inputs under one name. A member told only that their
  // address was refused is left checking six boxes, so the refusal has to land on the
  // box itself, the way a malformed email address does.
  test('marks the part of an address the site refuses', async ({ page, browser, baseURL }) => {
    const fieldName = `Shipping address ${Date.now()}`;
    const member = await createMemberFactory(page.request).create({
      name: 'Ada Lovelace',
      email: `ada-portal-fields-${Date.now()}@ghost.org`,
    });

    const settingsPage = new SettingsPage(page);
    await settingsPage.goto();
    await settingsPage.customFieldsSection.createField(fieldName, 'Address', 'Members can edit');

    const context = await browser.newContext({
      baseURL,
      extraHTTPHeaders: { Origin: baseURL! },
    });

    try {
      const memberPage = await context.newPage();
      await signInAsMember(memberPage, member);

      const accountHome = new PortalAccountHomePage(memberPage);
      await memberPage.goto('/#/portal/account');
      await accountHome.waitForPortalToOpen();

      const profile = new PortalAccountProfilePage(memberPage);
      await accountHome.portalFrame.locator('[data-test-button="edit-profile"]').click();
      await expect(profile.title).toBeVisible();

      // Asked for rather than derived from the name: the key is minted by the server,
      // and a test that guesses at the rule passes until the rule changes.
      const offered = await memberPage.request.get('/members/api/member/metafields/custom/');
      const { members_metafields: fields } = await offered.json();
      const key = fields.find((field: { name: string }) => field.name === fieldName)?.key;
      expect(key).toBeTruthy();

      // The one part the server will refuse; every other part is left alone, so the
      // refusal can only be about this one.
      await profile.partInput(key, 'line1').fill('x'.repeat(256));
      await profile.partInput(key, 'city').fill('London');
      await profile.save();

      await expect(profile.partInput(key, 'line1')).toHaveClass(/error/);
      await expect(profile.partInput(key, 'city')).not.toHaveClass(/error/);
    } finally {
      await context.close();
    }
  });
});
