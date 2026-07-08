import {HomePage, MemberDetailsPage, MembersPage, PortalPage} from '@/helpers/pages';
import {MemberFactory, createMemberFactory} from '@/data-factory';
import {expect, test} from '@/helpers/playwright';

test.describe('Ghost Admin - Member Impersonation', () => {
    // Pins to the Ember member-detail screen. The React implementation is
    // covered by `e2e/tests/admin/members/member-detail.test.ts` and the
    // cross-implementation contract by `member-detail-parity.test.ts`.
    test.use({labs: {memberDetailsReact: false}});

    let memberFactory: MemberFactory;

    test.beforeEach(async ({page}) => {
        memberFactory = createMemberFactory(page.request);
    });

    test('impersonates a member and verifies magic link generation', async ({page}) => {
        const {name} = await memberFactory.create({email: 'impersonate@ghost.org'});

        const membersPage = new MembersPage(page);

        await membersPage.goto();
        await membersPage.getMemberByName(name!).click();

        const memberDetailsPage = new MemberDetailsPage(page);
        await memberDetailsPage.settingsSection.memberActionsButton.click();
        await memberDetailsPage.settingsSection.impersonateButton.click();

        await expect(memberDetailsPage.magicLinkInput).not.toHaveValue('');
        const magicLink = await memberDetailsPage.magicLinkInput.inputValue();
        await memberDetailsPage.goto(magicLink);

        const homePage = new HomePage(page);
        await homePage.openAccountPortal();

        const portal = new PortalPage(page);

        await expect(portal.portalFrameBody).toContainText('Your account');
        await expect(portal.portalFrameBody).toContainText('impersonate@ghost.org');
    });
});
