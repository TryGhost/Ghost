import {APIRequestContext, Page} from '@playwright/test';
import {HomePage, MemberDetailsPage, MembersPage} from '@/helpers/pages';
import {MemberFactory, createMemberFactory} from '@/data-factory';
import {PortalAccountHomePage, PortalNewsletterManagementPage} from '@/portal-pages';
import {expect, test} from '@/helpers/playwright';
import {usePerTestIsolation} from '@/helpers/playwright/isolation';

usePerTestIsolation();

async function getNewsletterIds(request: APIRequestContext): Promise<string[]> {
    const response = await request.get('/ghost/api/admin/newsletters/?status=active&limit=all');
    const data = await response.json();
    return data.newsletters.map((n: {id: string}) => n.id);
}

async function createNewsletter(request: APIRequestContext, name: string): Promise<string> {
    const response = await request.post('/ghost/api/admin/newsletters/', {
        data: {newsletters: [{name}]}
    });
    const data = await response.json();
    return data.newsletters[0].id;
}

async function createSubscribedMember(request: APIRequestContext, memberFactory: MemberFactory) {
    const newsletterIds = await getNewsletterIds(request);
    const newsletters = newsletterIds.map(id => ({id}));
    const member = await memberFactory.create({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        newsletters: newsletters as any
    });
    return member;
}

async function impersonateMember(page: Page, memberName: string): Promise<void> {
    const membersPage = new MembersPage(page);
    await membersPage.goto();
    await membersPage.getMemberByName(memberName).click();

    const memberDetailsPage = new MemberDetailsPage(page);
    await memberDetailsPage.settingsSection.memberActionsButton.click();
    await memberDetailsPage.settingsSection.impersonateButton.click();

    await expect(memberDetailsPage.magicLinkInput).not.toHaveValue('');
    const magicLink = await memberDetailsPage.magicLinkInput.inputValue();
    await memberDetailsPage.goto(magicLink);

    const homePage = new HomePage(page);
    await homePage.waitUntilLoaded();
}

async function getMemberNewsletters(request: APIRequestContext, memberId: string): Promise<{id: string}[]> {
    const response = await request.get(`/ghost/api/admin/members/${memberId}/`);
    const data = await response.json();
    return data.members[0].newsletters;
}

test.describe('Portal - Member Actions', () => {
    let memberFactory: MemberFactory;

    test.beforeEach(async ({page}) => {
        memberFactory = createMemberFactory(page.request);
    });

    test('can log out', async ({page}) => {
        const member = await memberFactory.create();

        await impersonateMember(page, member.name!);

        const homePage = new HomePage(page);
        await homePage.openAccountPortal();

        const accountHome = new PortalAccountHomePage(page);
        await accountHome.signOut();

        await homePage.openPortal();

        await expect(accountHome.signinSwitchButton).toBeVisible();
    });

    test('can unsubscribe from newsletter', async ({page}) => {
        const member = await createSubscribedMember(page.request, memberFactory);

        await impersonateMember(page, member.name!);

        const homePage = new HomePage(page);
        await homePage.openAccountPortal();

        const accountHome = new PortalAccountHomePage(page);
        await expect(accountHome.defaultNewsletterCheckbox).toBeChecked();
        await accountHome.defaultNewsletterToggle.click();
        await expect(accountHome.defaultNewsletterCheckbox).not.toBeChecked();

        await expect(async () => {
            const memberNewsletters = await getMemberNewsletters(page.request, member.id);
            expect(memberNewsletters).toHaveLength(0);
        }).toPass();
    });

    test('can unsubscribe from all newsletters', async ({page}) => {
        await createNewsletter(page.request, 'Second newsletter');

        const member = await createSubscribedMember(page.request, memberFactory);

        await impersonateMember(page, member.name!);

        const homePage = new HomePage(page);
        await homePage.openAccountPortal();

        const accountHome = new PortalAccountHomePage(page);
        await accountHome.manageNewslettersButton.click();

        const newsletterManagement = new PortalNewsletterManagementPage(page);
        await expect(newsletterManagement.newsletterToggles).toHaveCount(2);
        await expect(newsletterManagement.newsletterToggleCheckbox(0)).toBeChecked();
        await expect(newsletterManagement.newsletterToggleCheckbox(1)).toBeChecked();

        await newsletterManagement.unsubscribeFromAllButton.click();
        await expect(newsletterManagement.successNotification).toBeVisible();

        await expect(newsletterManagement.newsletterToggleCheckbox(0)).not.toBeChecked();
        await expect(newsletterManagement.newsletterToggleCheckbox(1)).not.toBeChecked();

        const memberNewsletters = await getMemberNewsletters(page.request, member.id);
        expect(memberNewsletters).toHaveLength(0);
    });
});
