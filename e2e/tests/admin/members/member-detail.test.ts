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
});
