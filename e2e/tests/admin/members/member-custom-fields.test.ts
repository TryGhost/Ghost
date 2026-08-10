import {MemberDetailsPage, SettingsPage} from '@/admin-pages';
import {createMemberFactory} from '@/data-factory';
import {expect, test} from '@/helpers/playwright';
import {usePerTestIsolation} from '@/helpers/playwright/isolation';

/**
 * The custom-fields journey that crosses two surfaces: a field defined in
 * Settings has to appear on the member detail screen, take a value through its
 * own editor, and survive a reload. The acceptance tests cover the component
 * against a fake API; this pins the settings -> member-detail -> server
 * round-trip they mock away.
 *
 * React member detail only (the editor is a React-only feature) plus the
 * membersCustomFields flag that gates the whole feature.
 */
usePerTestIsolation();

test.describe('Ghost Admin - Member custom fields', () => {
    test.use({labs: {membersCustomFields: true, memberDetailsReact: true}});

    test('a field defined in settings takes a value on a member and persists it', async ({page}) => {
        const fieldName = `Job title ${Date.now()}`;
        const memberFactory = createMemberFactory(page.request);
        const member = await memberFactory.create({name: 'Ada Lovelace', email: `ada-custom-fields-${Date.now()}@ghost.org`});

        const settingsPage = new SettingsPage(page);
        const memberDetailsPage = new MemberDetailsPage(page);

        await settingsPage.goto();
        await settingsPage.customFieldsSection.createShortTextField(fieldName);

        await page.goto(`/ghost/#/members/${member.id}`);
        await expect(memberDetailsPage.customFieldEditButton(fieldName)).toBeVisible();

        await memberDetailsPage.setCustomFieldValue(fieldName, 'Editor');
        await expect(memberDetailsPage.customFieldsCard.getByText('Editor')).toBeVisible();

        await page.reload();

        await expect(memberDetailsPage.customFieldsCard.getByText('Editor')).toBeVisible();
    });
});
