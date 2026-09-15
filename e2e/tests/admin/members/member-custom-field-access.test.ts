import { Browser, BrowserContext, Page } from '@playwright/test';
import { Member, createMemberFactory } from '@/data-factory';
import { MemberDetailsPage, SettingsPage } from '@/admin-pages';
import { expect, test } from '@/helpers/playwright';
import { signInAsMember } from '@/helpers/playwright/flows/sign-in';
import { usePerTestIsolation } from '@/helpers/playwright/isolation';

// The member's side is read over its API rather than driven through Portal, which
// does not render these fields yet. Swap to real UI when it does.
usePerTestIsolation();

interface OfferedField {
  key: string;
  name: string;
  access: { member: string };
}

async function asMember(
  browser: Browser,
  baseURL: string,
  member: Member,
): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({ baseURL, extraHTTPHeaders: { Origin: baseURL } });
  const page = await context.newPage();
  await signInAsMember(page, member);
  return { context, page };
}

async function fieldsOfferedTo(page: Page): Promise<OfferedField[]> {
  const response = await page.request.get('/members/api/member/metafields/custom/');
  expect(response.status()).toBe(200);
  const { members_metafields: fields } = await response.json();
  return fields;
}

const namesOf = (fields: OfferedField[]): string[] => fields.map((field) => field.name);

async function offeredFieldNamed(page: Page, name: string): Promise<OfferedField> {
  const offered = (await fieldsOfferedTo(page)).find((field) => field.name === name);
  if (!offered) {
    throw new Error(`${name} is not among the fields offered to this member`);
  }
  return offered;
}

// Undefined when the member is told nothing at all, which is distinct from being
// told they hold no values.
async function valuesHeldBy(page: Page): Promise<Record<string, unknown> | undefined> {
  const response = await page.request.get('/members/api/member/');
  expect(response.status()).toBe(200);
  const account = await response.json();
  return account.metafields?.custom;
}

async function memberWrites(page: Page, key: string, value: string) {
  return page.request.put('/members/api/member/', {
    data: { metafields: { custom: { [key]: value } } },
  });
}

test.describe('Ghost Admin - Member custom field access', () => {
  test.use({ labs: { membersCustomFields: true } });

  test('a field kept to staff is invisible until the publisher opens it', async ({
    page,
    browser,
    baseURL,
  }) => {
    const fieldName = `Renewal note ${Date.now()}`;
    const member = await createMemberFactory(page.request).create({
      name: 'Ada Lovelace',
      email: `ada-field-access-${Date.now()}@ghost.org`,
    });

    const settingsPage = new SettingsPage(page);
    const memberDetailsPage = new MemberDetailsPage(page);

    await settingsPage.goto();
    await settingsPage.customFieldsSection.createField(fieldName, undefined, 'Only staff');

    await page.goto(`/ghost/#/members/${member.id}`);
    await memberDetailsPage.setCustomFieldValue(fieldName, 'Renewing, do not chase');

    const { context, page: memberPage } = await asMember(browser, baseURL!, member);
    try {
      expect(namesOf(await fieldsOfferedTo(memberPage))).not.toContain(fieldName);
      expect(await valuesHeldBy(memberPage)).toBeUndefined();

      await settingsPage.goto();
      await settingsPage.customFieldsSection.setAudience(fieldName, 'Members can view');

      const offered = await offeredFieldNamed(memberPage, fieldName);
      expect(offered.access).toEqual({ member: 'read' });
      expect((await valuesHeldBy(memberPage))?.[offered.key]).toBe('Renewing, do not chase');

      const refused = await memberWrites(memberPage, offered.key, 'Chase away');
      expect(refused.status()).toBe(422);
      expect((await refused.json()).errors[0].message).toMatch(/Cannot set custom field/);
    } finally {
      await context.close();
    }
  });

  test('a field opened to members is theirs to change, until it is closed again', async ({
    page,
    browser,
    baseURL,
  }) => {
    const fieldName = `Job title ${Date.now()}`;
    const member = await createMemberFactory(page.request).create({
      name: 'Grace Hopper',
      email: `grace-field-access-${Date.now()}@ghost.org`,
    });

    const settingsPage = new SettingsPage(page);
    const memberDetailsPage = new MemberDetailsPage(page);

    await settingsPage.goto();
    await settingsPage.customFieldsSection.createField(fieldName, undefined, 'Members can edit');

    const { context, page: memberPage } = await asMember(browser, baseURL!, member);
    try {
      const offered = await offeredFieldNamed(memberPage, fieldName);
      expect(offered.access).toEqual({ member: 'write' });

      const written = await memberWrites(memberPage, offered.key, 'Rear Admiral');
      expect(written.status()).toBe(200);

      await page.goto(`/ghost/#/members/${member.id}`);
      await expect(memberDetailsPage.customFieldsCard.getByText('Rear Admiral')).toBeVisible();

      await settingsPage.goto();
      await settingsPage.customFieldsSection.setAudience(fieldName, 'Only staff');

      expect(namesOf(await fieldsOfferedTo(memberPage))).not.toContain(fieldName);
      expect(await valuesHeldBy(memberPage)).toBeUndefined();

      const refused = await memberWrites(memberPage, offered.key, 'Commodore');
      expect(refused.status()).toBe(422);
      expect((await refused.json()).errors[0].message).toMatch(/Unknown custom field/);

      await page.goto(`/ghost/#/members/${member.id}`);
      await expect(memberDetailsPage.customFieldsCard.getByText('Rear Admiral')).toBeVisible();
    } finally {
      await context.close();
    }
  });
});
