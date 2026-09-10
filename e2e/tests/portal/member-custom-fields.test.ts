import { Browser, Page } from '@playwright/test';
import { Member, createMemberFactory } from '@/data-factory';
import { PortalAccountHomePage, PortalAccountProfilePage } from '@/portal-pages';
import { SettingsPage } from '@/admin-pages';
import { expect, test } from '@/helpers/playwright';
import { signInAsMember } from '@/helpers/playwright/flows/sign-in';
import { usePerTestIsolation } from '@/helpers/playwright/isolation';

usePerTestIsolation();

const OVER_LONG = 'x'.repeat(256);

/** Defines an address field the members of this site may edit. */
async function anAddressFieldMembersMayEdit(page: Page, fieldName: string): Promise<void> {
  const settingsPage = new SettingsPage(page);
  await settingsPage.goto();
  await settingsPage.customFieldsSection.createField(fieldName, 'Address', true);
}

/** Opens Portal account settings as the member, in a browser context of their own. */
async function accountSettingsAs(
  browser: Browser,
  baseURL: string,
  member: Member,
  fieldName: string,
) {
  const context = await browser.newContext({ baseURL, extraHTTPHeaders: { Origin: baseURL } });
  const memberPage = await context.newPage();
  await signInAsMember(memberPage, member);

  const accountHome = new PortalAccountHomePage(memberPage);
  await memberPage.goto('/#/portal/account');
  await accountHome.waitForPortalToOpen();

  const profile = new PortalAccountProfilePage(memberPage);
  await accountHome.portalFrame.locator('[data-test-button="edit-profile"]').click();
  await expect(profile.title).toBeVisible();

  // Asked for rather than derived from the name: the key is minted by the server, and a
  // test that guesses at the rule passes until the rule changes.
  const offered = await memberPage.request.get('/members/api/member/metafields/custom/');
  const { members_metafields: fields } = await offered.json();
  const key = fields.find((field: { name: string }) => field.name === fieldName)?.key;
  expect(key).toBeTruthy();

  return { context, memberPage, accountHome, profile, key: key as string };
}

test.describe('Portal - member custom fields', () => {
  test.use({ labs: { membersCustomFields: true } });

  // An address is drawn as several inputs under one name. A member told only that their
  // address was refused is left checking six boxes, so the refusal has to land on the
  // box itself, the way a malformed email address does.
  test('marks the part of an address the site refuses', async ({ page, browser, baseURL }) => {
    const fieldName = `Shipping address ${Date.now()}`;
    const member = await createMemberFactory(page.request).create({
      name: 'Ada Lovelace',
      email: `ada-marks-${Date.now()}@ghost.org`,
    });
    await anAddressFieldMembersMayEdit(page, fieldName);

    const { context, profile, key } = await accountSettingsAs(browser, baseURL!, member, fieldName);
    try {
      // The one part the server will refuse; every other part is left alone, so the
      // refusal can only be about this one.
      await profile.partInput(key, 'line1').fill(OVER_LONG);
      await profile.partInput(key, 'city').fill('London');
      await profile.save();

      await expect(profile.partInput(key, 'line1')).toHaveClass(/error/);
      await expect(profile.partInput(key, 'city')).not.toHaveClass(/error/);
    } finally {
      await context.close();
    }
  });

  // Leaving the page discards what was typed, so a refusal of it has to go too. The
  // refusal lives in app state, which outlives the page unless it is cleared, and a
  // value the member never sees again would otherwise come back marked as wrong.
  test('forgets a refusal once the member leaves the page', async ({ page, browser, baseURL }) => {
    const fieldName = `Shipping address ${Date.now()}`;
    const member = await createMemberFactory(page.request).create({
      name: 'Ada Lovelace',
      email: `ada-forgets-${Date.now()}@ghost.org`,
    });
    await anAddressFieldMembersMayEdit(page, fieldName);

    const { context, accountHome, profile, key } = await accountSettingsAs(
      browser,
      baseURL!,
      member,
      fieldName,
    );
    try {
      await profile.partInput(key, 'line1').fill(OVER_LONG);
      await profile.save();
      await expect(profile.partInput(key, 'line1')).toHaveClass(/error/);

      await profile.backButton.click();
      await expect(accountHome.signOutButton).toBeVisible();
      await accountHome.portalFrame.locator('[data-test-button="edit-profile"]').click();
      await expect(profile.title).toBeVisible();

      // The page is rebuilt from what the site holds, so the refused text is gone. The
      // mark on it must not have outlived it.
      await expect(profile.partInput(key, 'line1')).toHaveValue('');
      await expect(profile.partInput(key, 'line1')).not.toHaveClass(/error/);
    } finally {
      await context.close();
    }
  });

  // The site answers with every value it refused, so a member correcting an address is
  // told everything that is wrong with it at once rather than one line per attempt.
  test('marks every part the site refuses at once', async ({ page, browser, baseURL }) => {
    const fieldName = `Shipping address ${Date.now()}`;
    const member = await createMemberFactory(page.request).create({
      name: 'Ada Lovelace',
      email: `ada-all-${Date.now()}@ghost.org`,
    });
    await anAddressFieldMembersMayEdit(page, fieldName);

    const { context, profile, key } = await accountSettingsAs(browser, baseURL!, member, fieldName);
    try {
      await profile.partInput(key, 'line1').fill(OVER_LONG);
      await profile.partInput(key, 'line2').fill(OVER_LONG);
      await profile.partInput(key, 'city').fill(OVER_LONG);
      await profile.save();

      await expect(profile.partInput(key, 'line1')).toHaveClass(/error/);
      await expect(profile.partInput(key, 'line2')).toHaveClass(/error/);
      await expect(profile.partInput(key, 'city')).toHaveClass(/error/);
      // Untouched, so still fine: the marking follows the refusals rather than the field.
      await expect(profile.partInput(key, 'state')).not.toHaveClass(/error/);
    } finally {
      await context.close();
    }
  });

  // Two parts share a row, their borders merged so the row reads as one field. An error
  // rendered above its input would add height to one of the pair and leave the other
  // standing higher, breaking that in the very state the message exists to report.
  test('keeps a grouped row level when one of its parts is refused', async ({
    page,
    browser,
    baseURL,
  }) => {
    const fieldName = `Shipping address ${Date.now()}`;
    const member = await createMemberFactory(page.request).create({
      name: 'Ada Lovelace',
      email: `ada-level-${Date.now()}@ghost.org`,
    });
    await anAddressFieldMembersMayEdit(page, fieldName);

    const { context, profile, key } = await accountSettingsAs(browser, baseURL!, member, fieldName);
    try {
      // `city` and `state` are the pair that share a row.
      await profile.partInput(key, 'city').fill(OVER_LONG);
      await profile.save();
      await expect(profile.partInput(key, 'city')).toHaveClass(/error/);

      const city = await profile.partInput(key, 'city').boundingBox();
      const state = await profile.partInput(key, 'state').boundingBox();
      expect(city).toBeTruthy();
      expect(state).toBeTruthy();
      expect(Math.abs(city!.y - state!.y)).toBeLessThan(1);
    } finally {
      await context.close();
    }
  });
});
