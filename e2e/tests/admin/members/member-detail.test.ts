import {MemberDetailsPage} from '@/admin-pages';
import {MemberFactory, createMemberFactory} from '@/data-factory';
import {expect, test} from '@/helpers/playwright';
import {usePerTestIsolation} from '@/helpers/playwright/isolation';

usePerTestIsolation();

// The React member-detail screen is being migrated from Ember. While it is built
// up it lives on a temporary preview route (`/members/preview/:id`) so the live
// Ember screen and its legacy e2e suite keep working. At cutover this navigates
// to the real `/members/:id` path.
const previewPath = (memberId: string) => `/ghost/#/members/preview/${memberId}`;

test.describe('Ghost Admin - Member Detail (React)', () => {
    let memberFactory: MemberFactory;

    test.beforeEach(async ({page}) => {
        memberFactory = createMemberFactory(page.request);
    });

    test('renders the member name for an existing member', async ({page}) => {
        const member = await memberFactory.create({name: 'Ada Lovelace', email: 'ada@ghost.org'});

        await page.goto(previewPath(member.id));

        await expect(page.getByTestId('member-detail-title')).toHaveText('Ada Lovelace');
    });

    test('back control returns to the members list', async ({page}) => {
        const member = await memberFactory.create({name: 'Grace Hopper', email: 'grace@ghost.org'});
        const memberDetailsPage = new MemberDetailsPage(page);

        await page.goto(previewPath(member.id));
        await memberDetailsPage.membersBackLink.click();

        await expect(page).toHaveURL(/#\/members$/);
    });

    test('shows the member sidebar with location and signup date', async ({page}) => {
        const member = await memberFactory.create({name: 'Katherine Johnson', email: 'katherine@ghost.org'});

        await page.goto(previewPath(member.id));

        const sidebar = page.getByTestId('member-detail-sidebar');
        await expect(sidebar).toBeVisible();
        // API-created members have no geolocation, so the location falls back deterministically.
        await expect(page.getByTestId('member-detail-location')).toHaveText('Unknown location');
        await expect(sidebar).toContainText('Created —');
    });

    test('edits a member name and persists it', async ({page}) => {
        const member = await memberFactory.create({name: 'Ada Lovelace', email: 'ada-edit@ghost.org'});
        const memberDetailsPage = new MemberDetailsPage(page);

        await page.goto(previewPath(member.id));
        await memberDetailsPage.nameInput.fill('Ada L. Byron');
        await memberDetailsPage.save();

        // Reload straight from the server to prove the edit was persisted, not just local.
        await page.reload();
        await expect(page.getByTestId('member-detail-title')).toHaveText('Ada L. Byron');
        await expect(memberDetailsPage.nameInput).toHaveValue('Ada L. Byron');
    });

    test('warns before leaving with unsaved changes', async ({page}) => {
        const member = await memberFactory.create({name: 'Grace Hopper', email: 'grace-edit@ghost.org'});
        const memberDetailsPage = new MemberDetailsPage(page);

        await page.goto(previewPath(member.id));
        await memberDetailsPage.nameInput.fill('Grace B. Hopper');
        await memberDetailsPage.membersBackLink.click();

        await expect(memberDetailsPage.confirmLeaveButton).toBeVisible();
        await memberDetailsPage.confirmLeaveButton.click();
        await expect(page).toHaveURL(/#\/members$/);
    });

    test('disables save when the email is invalid', async ({page}) => {
        const member = await memberFactory.create({name: 'Katherine Johnson', email: 'katherine-edit@ghost.org'});
        const memberDetailsPage = new MemberDetailsPage(page);

        await page.goto(previewPath(member.id));
        await memberDetailsPage.emailInput.fill('not-an-email');

        await expect(memberDetailsPage.saveButton).toBeDisabled();
    });

    test('removes an existing label and persists it', async ({page}) => {
        const member = await memberFactory.create({name: 'Labeled Member', email: 'labeled@ghost.org', labels: ['VIP']});
        const memberDetailsPage = new MemberDetailsPage(page);
        const labelsField = page.getByTestId('member-labels-field');

        await page.goto(previewPath(member.id));
        await expect(labelsField.getByText('VIP')).toBeVisible();

        await labelsField.getByText('VIP').click();
        await memberDetailsPage.save();

        await page.reload();
        await expect(labelsField.getByText('VIP')).toHaveCount(0);
    });

    test('adds a new label via the picker and persists it', async ({page}) => {
        const member = await memberFactory.create({name: 'Unlabeled Member', email: 'unlabeled@ghost.org'});
        const memberDetailsPage = new MemberDetailsPage(page);
        const labelsField = page.getByTestId('member-labels-field');

        await page.goto(previewPath(member.id));
        await labelsField.getByRole('combobox').click();
        await page.getByPlaceholder('Search labels...').fill('Beta');
        await page.getByText('Create "Beta"').click();
        await memberDetailsPage.save();

        await page.reload();
        await expect(labelsField.getByText('Beta')).toBeVisible();
    });

    test('creates a new member and redirects to their detail', async ({page}) => {
        const memberDetailsPage = new MemberDetailsPage(page);

        // The create screen reuses the preview route with the sentinel id "new".
        await page.goto(previewPath('new'));
        await expect(page.getByTestId('member-detail-title')).toHaveText('New member');
        await expect(memberDetailsPage.saveButton).toBeDisabled();

        await memberDetailsPage.nameInput.fill('Grace Hopper');
        await memberDetailsPage.emailInput.fill('grace-new@ghost.org');
        await memberDetailsPage.saveButton.click();

        // Redirected to the newly-created member's detail (now in edit mode).
        await expect(page.getByTestId('member-detail-title')).toHaveText('Grace Hopper');
        await expect(memberDetailsPage.emailInput).toHaveValue('grace-new@ghost.org');
        await expect(page).not.toHaveURL(/preview\/new$/);

        // Ember parity: the new member is auto-subscribed to default newsletters.
        // Ember achieves this by the model defaulting subscribed:true; we rely on
        // the server default (subscribed !== false && !newsletters), so pin the
        // outcome so a future server change can't silently regress it.
        const search = await page.request.get('/ghost/api/admin/members/?filter=email%3Agrace-new%40ghost.org&include=newsletters');
        const {members} = await search.json();
        expect(members[0].subscribed).toBe(true);
        expect(members[0].newsletters.length).toBeGreaterThan(0);
    });
});
