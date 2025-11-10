import {HomePage, MemberDetailsPage, MembersPage, PortalPage} from '../../../helpers/pages';
import {MemberFactory, createMemberFactory} from '../../../data-factory';
import {expect, test} from '../../../helpers/playwright';

test.describe('Ghost Admin - Member Impersonation', () => {
    let memberFactory: MemberFactory;

    test.beforeEach(async ({page}) => {
        memberFactory = createMemberFactory(page.request);
    });

    test('impersonates a member and verifies magic link generation', async ({page}) => {
        const {name, email} = memberFactory.build({email: 'impersonate@ghost.org'});

        const membersPage = new MembersPage(page);
        await membersPage.goto();
        await membersPage.newMemberButton.click();

        const memberDetailsPage = new MemberDetailsPage(page);
        await memberDetailsPage.nameInput.fill(name);
        await memberDetailsPage.emailInput.fill(email);
        await memberDetailsPage.save();

        await membersPage.goto();
        await membersPage.getMemberByName(name).click();

        await memberDetailsPage.memberActionsButton.click();
        await memberDetailsPage.impersonateButton.click();

        await expect(memberDetailsPage.magicLinkInput).not.toHaveValue('');
        const magicLink = await memberDetailsPage.magicLinkInput.inputValue();

        await memberDetailsPage.goto(magicLink);

        const homePage = new HomePage(page);
        await homePage.accountButton.click();

        const portal = new PortalPage(page);
        await expect(portal.body).toContainText('Your account');
        await expect(portal.body).toContainText('impersonate@ghost.org');
    });
});
