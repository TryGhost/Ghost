import {APIRequestContext} from '@playwright/test';
import {EmailClient, MailPit} from '@/helpers/services/email/mail-pit';
import {HomePage, PublicPage} from '@/public-pages';
import {MemberDetailsPage, MembersPage} from '@/admin-pages';
import {MembersService} from '@/helpers/services/members';
import {createAutomatedEmailFactory} from '@/data-factory';
import {expect, test} from '@/helpers/playwright';
import {extractMagicLink} from '@/helpers/services/email/utils';
import {signupViaPortal} from '@/helpers/playwright/flows/signup';

async function waitForWelcomeEmailReceivedEvent(request: APIRequestContext, memberId: string) {
    await expect.poll(async () => {
        const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
        const filter = encodeURIComponent(`data.created_at:<'${now}'+type:automated_email_sent_event+data.member_id:'${memberId}'`);
        const response = await request.get(`/ghost/api/admin/members/events/?filter=${filter}&limit=5`);
        const data = await response.json();
        return data.events?.length > 0;
    }, {timeout: 10000}).toBe(true);
}

test.describe('Ghost Admin - Member Activity Events', () => {
    let emailClient: EmailClient;

    test.beforeEach(async () => {
        emailClient = new MailPit();
    });

    test('welcome email event appears in member activity feed', async ({page}) => {
        const automatedEmailFactory = createAutomatedEmailFactory(page.request);
        await automatedEmailFactory.create();

        const homePage = new HomePage(page);
        await homePage.goto();
        const {emailAddress, name} = await signupViaPortal(page);

        const messages = await emailClient.searchByRecipient(emailAddress, {timeoutMs: 10000});
        const latestMessage = await emailClient.getMessageDetailed(messages[0]);
        const magicLink = extractMagicLink(latestMessage.Text);

        const publicPage = new PublicPage(page);
        await publicPage.goto(magicLink);
        await homePage.waitUntilLoaded();

        const membersService = new MembersService(page.request);
        const member = await membersService.getByEmail(emailAddress);

        await waitForWelcomeEmailReceivedEvent(page.request, member.id);

        const membersPage = new MembersPage(page);
        await membersPage.goto();
        await membersPage.getMemberByName(name).click();

        const memberDetailsPage = new MemberDetailsPage(page);
        const welcomeEmailEvent = memberDetailsPage.getActivityEventByText(/received welcome email \(Free\)/i);

        await expect(welcomeEmailEvent).toBeVisible();
    });
});
