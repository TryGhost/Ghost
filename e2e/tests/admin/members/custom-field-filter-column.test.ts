import {MemberDetailsPage, MembersListPage, SettingsPage} from '@/admin-pages';
import {createMemberFactory} from '@/data-factory';
import {expect, test} from '@/helpers/playwright';
import {usePerTestIsolation} from '@/helpers/playwright/isolation';

/**
 * Filtering the members list by a custom field earns a column showing what each matched
 * member holds for it. A filter says who matched; the column is what they said.
 *
 * Driven end to end because the column only appears if every layer agrees: the field is
 * defined in Settings, the filter asks the API to return its values, and the list reads
 * them back under the name the publisher gave the field. A unit test can pin the column
 * derivation but cannot prove the values ever arrive.
 *
 * React member detail (the value editor is React-only) plus the membersCustomFields flag
 * that gates the whole feature.
 */
usePerTestIsolation();

test.describe('Ghost Admin - Custom field filter columns', () => {
    test.use({labs: {membersCustomFields: true, memberDetailsReact: true}});

    test('a filtered custom field earns a column showing each member\'s value', async ({page}) => {
        test.slow();

        const stamp = Date.now();
        const fieldName = `Company ${stamp}`;
        const memberFactory = createMemberFactory(page.request);

        const memberName = `Ghost Employee ${stamp}`;
        // Shares nothing with the member's name or email, so the assertion below can only
        // be satisfied by the column and not by text the row already had.
        const value = `Wraith Industries ${stamp}`;

        const member = await memberFactory.create({name: memberName, email: `ghost-${stamp}@example.com`});

        const settingsPage = new SettingsPage(page);
        const memberDetailsPage = new MemberDetailsPage(page);
        const membersPage = new MembersListPage(page);

        await settingsPage.goto();
        await settingsPage.customFieldsSection.createShortTextField(fieldName);

        await page.goto(`/ghost/#/members/${member.id}`);
        await memberDetailsPage.setCustomFieldValue(fieldName, value);

        // Unfiltered, the field has earned nothing: a column is the filter's doing.
        await page.goto('/ghost/#/members');
        await expect(membersPage.getMemberByName(memberName)).toBeVisible();
        await expect(membersPage.getColumnHeader(fieldName)).toHaveCount(0);

        await membersPage.addCustomFieldFilter({field: fieldName, value});

        await expect(membersPage.getColumnHeader(fieldName)).toHaveCount(1);
        await expect(membersPage.getMemberCellWithText(memberName, value)).toBeVisible();
    });

    test('a composite field reads as the same one line in the column and on the member', async ({page}) => {
        test.slow();

        const stamp = Date.now();
        const fieldName = `Shipping ${stamp}`;
        const memberName = `Shipped To ${stamp}`;
        // State and postal code pair up, and the unfilled line 2 drops out rather than
        // leaving a gap, which is what makes this one line rather than a join of parts.
        const expectedLine = '1 Main St, Berlin, BE 10115, DE';
        const memberFactory = createMemberFactory(page.request);

        const member = await memberFactory.create({name: memberName, email: `shipped-${stamp}@example.com`});

        const settingsPage = new SettingsPage(page);
        const memberDetailsPage = new MemberDetailsPage(page);
        const membersPage = new MembersListPage(page);

        await settingsPage.goto();
        await settingsPage.customFieldsSection.createAddressField(fieldName);

        await page.goto(`/ghost/#/members/${member.id}`);
        await memberDetailsPage.setCompositeCustomFieldValue(fieldName, {
            'Address line 1': '1 Main St',
            City: 'Berlin',
            State: 'BE',
            'Postal code': '10115',
            Country: 'DE'
        });

        // The detail screen's rendering, read from the row's accessible name.
        await expect(memberDetailsPage.customFieldRow(fieldName))
            .toHaveAccessibleName(`Edit ${fieldName}: ${expectedLine}`);

        await page.goto('/ghost/#/members');
        // Choosing a part leaves the operator on "is set", which takes no value, so the
        // operator has to be named before there is anywhere to type one.
        await membersPage.addCustomFieldFilter({field: fieldName, subfield: 'City', operator: 'is', value: 'Berlin'});

        // The same line, from the same formatter, in the column the filter earned.
        await expect(membersPage.getColumnHeader(fieldName)).toHaveCount(1);
        await expect(membersPage.getMemberCellWithText(memberName, expectedLine)).toBeVisible();
    });
});
