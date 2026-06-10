import {HomePage, MemberDetailsPage, MembersPage, PortalPage} from '@/helpers/pages';
import {createMemberFactory} from '@/data-factory';
import {expect, test} from '@/helpers/playwright';
import {faker} from '@faker-js/faker';

/**
 * Member impersonation tests, shared between the Ember implementation (labs
 * flag off, the default) and the React implementation (labs flag
 * `memberDetailsX` on).
 *
 * Tests are order-independent: every test creates its own member with a
 * unique name and email.
 */
export function defineMemberImpersonationTests() {
    test('impersonates a member and verifies magic link generation', async ({page}) => {
        const memberFactory = createMemberFactory(page.request);
        const email = `impersonate-${faker.string.alphanumeric(8).toLowerCase()}@ghost.org`;
        const {name} = await memberFactory.create({
            name: `Impersonated member ${faker.string.alphanumeric(6)}`,
            email
        });

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
        await expect(portal.portalFrameBody).toContainText(email);
    });
}
