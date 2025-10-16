import {test, expect} from '../../helpers/playwright';
import {EmailClient, MailhogClient} from '../../helpers/services/email/MailhogClient';
import {EmailMessageBody} from '../../helpers/services/email/EmailMessageBody';
import {HomePage, PublicPage} from '../../helpers/pages/public';
import {MembersPage, MemberDetailsPage} from '../../helpers/pages/admin';
import {signupViaPortal} from '../../helpers/playwright/flows/signup';
import {extractMagicLink} from '../../helpers/services/email/utils';
import {createPostFactory, PostFactory} from '../../data-factory';
import {Page} from '@playwright/test';

test.describe('Ghost Public - Member Signup - Types', () => {
    let emailClient: EmailClient;

    test.beforeEach(async () => {
        emailClient = new MailhogClient();
    });

    async function finishSignupByMagicLinkInEmail(page: Page, emailAddress: string) {
        const messages = await emailClient.searchByRecipient(emailAddress);
        const emailMessageBodyParts = new EmailMessageBody(messages[0]);
        const emailTextBody = emailMessageBodyParts.getTextContent();

        const magicLink = extractMagicLink(emailTextBody);
        const publicPage = new PublicPage(page);
        await publicPage.goto(magicLink);
        await new HomePage(page).waitUntilLoaded();
    }

    test('signed up with magic link - direct', async ({page}) => {
        await new HomePage(page).goto();
        const {emailAddress, name} = await signupViaPortal(page);

        await finishSignupByMagicLinkInEmail(page, emailAddress);

        const homePage = new HomePage(page);
        await expect(homePage.accountButton).toBeVisible();

        const membersPage = new MembersPage(page);
        await membersPage.goto();
        await membersPage.clickMemberByEmail(emailAddress);

        const membersDetailsPage = new MemberDetailsPage(page);

        await expect(membersDetailsPage.body).toContainText(/Source.*—.*Direct/);
        await expect(membersDetailsPage.body).toContainText(/Page.*—.*homepage/);
        await expect(membersDetailsPage.nameInput).toHaveValue(name);
    });

    test('signed up with magic link - direct from post', async ({page}) => {
        const postFactory: PostFactory = createPostFactory(page.request);
        const post = await postFactory.create({title: 'Test Post', status: 'published'});

        const homePage = new HomePage(page);
        await homePage.goto();
        await homePage.linkWithPostName(post.title).click();
        const {emailAddress, name} = await signupViaPortal(page);

        await finishSignupByMagicLinkInEmail(page, emailAddress);

        const membersPage = new MembersPage(page);
        await membersPage.goto();
        await membersPage.clickMemberByEmail(emailAddress);

        const membersDetailsPage = new MemberDetailsPage(page);

        await expect(membersDetailsPage.body).toContainText(/Source.*—.*Direct/);
        await expect(membersDetailsPage.body).toContainText(/Page.*—.*Test Post/);
        await expect(membersDetailsPage.nameInput).toHaveValue(name);
    });

    test('signed up with magic link - from referrer', async ({page}) => {
        const postFactory: PostFactory = createPostFactory(page.request);
        const post = await postFactory.create({title: 'Google Test Post', status: 'published'});

        const homePage = new HomePage(page);
        await homePage.goto('/', {referer: 'https://www.google.com', waitUntil: 'domcontentloaded'});
        await homePage.linkWithPostName(post.title).click();
        const {emailAddress, name} = await signupViaPortal(page);

        await finishSignupByMagicLinkInEmail(page, emailAddress);

        const membersPage = new MembersPage(page);
        await membersPage.goto();
        await membersPage.clickMemberByEmail(emailAddress);

        const membersDetailsPage = new MemberDetailsPage(page);

        await expect(membersDetailsPage.body).toContainText(/Source.*—.*Google/);
        await expect(membersDetailsPage.body).toContainText(/Page.*—.*Google Test Post/);
        await expect(membersDetailsPage.nameInput).toHaveValue(name);
    });

    test('signed up with magic link - direct from newsletter', async ({page}) => {
        const postFactory: PostFactory = createPostFactory(page.request);
        const post = await postFactory.create({title: 'Newsletter Post', status: 'published'});

        const homePage = new HomePage(page);
        await homePage.goto(`${post.slug}?ref=ghost-newsletter`);
        const {emailAddress, name} = await signupViaPortal(page);

        await finishSignupByMagicLinkInEmail(page, emailAddress);

        const membersPage = new MembersPage(page);
        await membersPage.goto();
        await membersPage.clickMemberByEmail(emailAddress);

        const membersDetailsPage = new MemberDetailsPage(page);

        await expect(membersDetailsPage.body).toContainText(/Source.*—.*ghost newsletter/);
        await expect(membersDetailsPage.body).toContainText(/Page.*—.*Newsletter Post/);
        await expect(membersDetailsPage.nameInput).toHaveValue(name);
    });

    test('signed up with magic link - utm_source=twitter', async ({page}) => {
        const postFactory: PostFactory = createPostFactory(page.request);
        const post = await postFactory.create({title: 'UTM Source Post', status: 'published'});

        const homePage = new HomePage(page);
        await homePage.goto(`${post.slug}?utm_source=twitter`);
        const {emailAddress, name} = await signupViaPortal(page);

        await finishSignupByMagicLinkInEmail(page, emailAddress);

        const membersPage = new MembersPage(page);
        await membersPage.goto();
        await membersPage.clickMemberByEmail(emailAddress);

        const membersDetailsPage = new MemberDetailsPage(page);

        await expect(membersDetailsPage.body).toContainText(/Source.*—.*Twitter/);
        await expect(membersDetailsPage.body).toContainText(/Page.*—.*UTM Source Post/);
        await expect(membersDetailsPage.nameInput).toHaveValue(name);
    });
});
