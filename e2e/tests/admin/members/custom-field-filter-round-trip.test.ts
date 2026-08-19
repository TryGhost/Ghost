import {MemberDetailsPage, MembersListPage, SettingsPage, SidebarPage} from '@/admin-pages';
import {createMemberFactory} from '@/data-factory';
import {expect, test} from '@/helpers/playwright';
import {usePerTestIsolation} from '@/helpers/playwright/isolation';

/**
 * The full custom-fields filtering journey across every surface it touches:
 * define a field in Settings, give one member a value on the React detail screen,
 * filter the members list by that field, save the filter as a segment, and reopen
 * the segment to confirm the filter round-trips. The last step is the point of the
 * test — a saved segment is only its NQL string, so reopening it and seeing the
 * filter restored (and the same members matched) proves the compound grammar
 * parses back to exactly what produced it.
 *
 * React member detail (the value editor is React-only) plus the membersCustomFields
 * flag that gates the whole feature.
 */
usePerTestIsolation();

test.describe('Ghost Admin - Filter members by custom fields', () => {
    test.use({labs: {membersCustomFields: true, memberDetailsReact: true}});

    test('a custom field filter can be built, saved as a segment, and reopened intact', async ({page}) => {
        test.slow();

        const stamp = Date.now();
        const fieldName = `Company ${stamp}`;
        const viewName = `Ghost staff ${stamp}`;
        const memberFactory = createMemberFactory(page.request);

        const matchingMember = await memberFactory.create({name: `Ghost Employee ${stamp}`, email: `ghost-${stamp}@example.com`});
        await memberFactory.create({name: `Acme Employee ${stamp}`, email: `acme-${stamp}@example.com`});

        const settingsPage = new SettingsPage(page);
        const memberDetailsPage = new MemberDetailsPage(page);
        const membersPage = new MembersListPage(page);
        const sidebar = new SidebarPage(page);

        // Define the field
        await settingsPage.goto();
        await settingsPage.customFieldsSection.createShortTextField(fieldName);

        // Give one member a value for it
        await page.goto(`/ghost/#/members/${matchingMember.id}`);
        await memberDetailsPage.setCustomFieldValue(fieldName, 'Ghost');

        // Filter the members list by the field
        await page.goto('/ghost/#/members');
        await membersPage.addCustomFieldFilter({field: fieldName, value: 'Ghost'});

        await expect(membersPage.getMemberByName(`Ghost Employee ${stamp}`)).toBeVisible();
        await expect(membersPage.getMemberByName(`Acme Employee ${stamp}`)).toHaveCount(0);

        // Save it as a segment; the saved view becomes active
        await membersPage.saveCurrentView(viewName);
        await expect(sidebar.getNavLink(viewName)).toHaveAttribute('aria-current', 'page');

        // Leave the segment
        await sidebar.getNavLink('Members').click();
        await expect(sidebar.getNavLink(viewName)).not.toHaveAttribute('aria-current', 'page');

        // Reopen it: the filter round-trips (the view goes active again only if the
        // reopened NQL re-serializes to the exact saved string), the custom-field
        // filter is present, and the same member is matched.
        await sidebar.getNavLink(viewName).click();

        await expect(sidebar.getNavLink(viewName)).toHaveAttribute('aria-current', 'page');
        await expect(membersPage.getFilterItem(fieldName)).toContainText(fieldName);
        await expect(membersPage.getMemberByName(`Ghost Employee ${stamp}`)).toBeVisible();
        await expect(membersPage.getMemberByName(`Acme Employee ${stamp}`)).toHaveCount(0);
    });

    /**
     * A composite stores one row per part, and each part filters as a field in its own right,
     * so the pill carries a part alongside the value. Filtering on one part must not match a
     * member whose other parts happen to hold that value.
     */
    test('an address filter matches on the chosen part only', async ({page}) => {
        test.slow();

        const stamp = Date.now();
        const fieldName = `Shipping ${stamp}`;
        const memberFactory = createMemberFactory(page.request);

        const inLondon = await memberFactory.create({name: `London Buyer ${stamp}`, email: `london-${stamp}@example.com`});
        const inBoston = await memberFactory.create({name: `Boston Buyer ${stamp}`, email: `boston-${stamp}@example.com`});

        const settingsPage = new SettingsPage(page);
        const memberDetailsPage = new MemberDetailsPage(page);
        const membersPage = new MembersListPage(page);

        await settingsPage.goto();
        await settingsPage.customFieldsSection.createAddressField(fieldName);

        await page.goto(`/ghost/#/members/${inLondon.id}`);
        await memberDetailsPage.setCompositeCustomFieldValue(fieldName, {
            'Address line 1': '1 King St',
            City: 'London',
            // The country part validates as a 2-letter code.
            Country: 'GB'
        });

        // 'London' sits in this member's Address line 1, so a filter on City must not match it.
        await page.goto(`/ghost/#/members/${inBoston.id}`);
        await memberDetailsPage.setCompositeCustomFieldValue(fieldName, {
            'Address line 1': 'London House',
            City: 'Boston',
            Country: 'US'
        });

        await page.goto('/ghost/#/members');
        // A composite defaults to the presence operator, which takes no value, so the
        // operator is chosen explicitly here.
        await membersPage.addCustomFieldFilter({field: fieldName, subfield: 'City', operator: 'is', value: 'London'});

        await expect(membersPage.getMemberByName(`London Buyer ${stamp}`)).toBeVisible();
        await expect(membersPage.getMemberByName(`Boston Buyer ${stamp}`)).toHaveCount(0);
    });

    test('an is-set custom field filter matches members that have a value', async ({page}) => {
        test.slow();

        const stamp = Date.now();
        const fieldName = `Phone ${stamp}`;
        const memberFactory = createMemberFactory(page.request);

        const withValue = await memberFactory.create({name: `Reachable ${stamp}`, email: `reachable-${stamp}@example.com`});
        await memberFactory.create({name: `Unreachable ${stamp}`, email: `unreachable-${stamp}@example.com`});

        const settingsPage = new SettingsPage(page);
        const memberDetailsPage = new MemberDetailsPage(page);
        const membersPage = new MembersListPage(page);

        await settingsPage.goto();
        await settingsPage.customFieldsSection.createShortTextField(fieldName);

        await page.goto(`/ghost/#/members/${withValue.id}`);
        await memberDetailsPage.setCustomFieldValue(fieldName, '+44 20 7946 0000');

        await page.goto('/ghost/#/members');
        await membersPage.addCustomFieldFilter({field: fieldName, operator: 'is set'});

        await expect(membersPage.getMemberByName(`Reachable ${stamp}`)).toBeVisible();
        await expect(membersPage.getMemberByName(`Unreachable ${stamp}`)).toHaveCount(0);
    });
});
