import {test, expect} from '../../helpers/playwright';
import {EmailClient, MailhogClient} from '../../helpers/services/email/MailhogClient';
import {EmailMessageBody} from '../../helpers/services/email/EmailMessageBody';
import {HomePage, PublicPage} from '../../helpers/pages/public';
import {MembersPage, MemberDetailsPage} from '../../helpers/pages/admin';
import {signupViaPortal} from '../../helpers/playwright/flows/signup';
import {extractMagicLink} from '../../helpers/services/email/utils';
import {createPostFactory, PostFactory} from '../../data-factory';

test.describe('Ghost Public - Member Signup - Types', () => {
    let emailClient: EmailClient;

    test.beforeEach(async () => {
        emailClient = new MailhogClient();
    });

    test('signed up with magic link - direct', async ({page}) => {
        await new HomePage(page).goto();
        const {emailAddress, name} = await signupViaPortal(page);

        const message = await emailClient.waitForEmail(emailAddress);
        const emailMessageBodyParts = new EmailMessageBody(message);
        const emailTextBody = emailMessageBodyParts.getTextContent();

        const magicLink = extractMagicLink(emailTextBody);
        const publicPage = new PublicPage(page);
        await publicPage.goto(magicLink);
        await publicPage.waitForPageToFullyLoad();

        const homePage = new HomePage(page);
        await homePage.waitForSignedIn();

        const membersPage = new MembersPage(page);
        await membersPage.goto();
        await membersPage.clickMemberByEmail(emailAddress);

        const membersDetailsPage = new MemberDetailsPage(page);

        await expect(membersDetailsPage.body).toContainText(/Source.*—.*Direct/);
        await expect(membersDetailsPage.body).toContainText(/Page.*—.*homepage/);
        await expect(membersDetailsPage.nameInput).toHaveValue(name);
    });

    test('signed up with magic link - direct from post', async ({page}) => {
        const postFactory: PostFactory = createPostFactory(page);
        const post = await postFactory.create({title: 'Test Post', status: 'published'});

        const homePage = new HomePage(page);
        await homePage.goto();
        await homePage.linkWithPostName(post.title).click();
        const {emailAddress, name} = await signupViaPortal(page);

        const message = await emailClient.waitForEmail(emailAddress);
        const emailMessageBodyParts = new EmailMessageBody(message);
        const emailTextBody = emailMessageBodyParts.getTextContent();

        const magicLink = extractMagicLink(emailTextBody);
        const publicPage = new PublicPage(page);
        await publicPage.goto(magicLink);
        await publicPage.waitForPageToFullyLoad();

        await homePage.waitForSignedIn();

        const membersPage = new MembersPage(page);
        await membersPage.goto();
        await membersPage.clickMemberByEmail(emailAddress);

        const membersDetailsPage = new MemberDetailsPage(page);

        await expect(membersDetailsPage.body).toContainText(/Source.*—.*Direct/);
        await expect(membersDetailsPage.body).toContainText(/Page.*—.*Test Post/);
        await expect(membersDetailsPage.nameInput).toHaveValue(name);
    });

    test('signed up with magic link - from referrer', async ({page}) => {
        const postFactory: PostFactory = createPostFactory(page);
        const post = await postFactory.create({title: 'Google Test Post', status: 'published'});

        const homePage = new HomePage(page);
        await homePage.goto('/', {referer: 'https://www.google.com', waitUntil: 'domcontentloaded'});
        await homePage.linkWithPostName(post.title).click();
        const {emailAddress, name} = await signupViaPortal(page);

        const message = await emailClient.waitForEmail(emailAddress);
        const emailMessageBodyParts = new EmailMessageBody(message);
        const emailTextBody = emailMessageBodyParts.getTextContent();

        const magicLink = extractMagicLink(emailTextBody);
        const publicPage = new PublicPage(page);
        await publicPage.goto(magicLink);
        await publicPage.waitForPageToFullyLoad();

        await homePage.waitForSignedIn();

        const membersPage = new MembersPage(page);
        await membersPage.goto();
        await membersPage.clickMemberByEmail(emailAddress);

        const membersDetailsPage = new MemberDetailsPage(page);

        await expect(membersDetailsPage.body).toContainText(/Source.*—.*Google/);
        await expect(membersDetailsPage.body).toContainText(/Page.*—.*Google Test Post/);
        await expect(membersDetailsPage.nameInput).toHaveValue(name);
    });
});
