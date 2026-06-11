// Vendored from /e2e/tests/public/member-signup-types.test.ts; the email
// client reads phantom's in-memory mail sink.
import {MailPit, extractMagicLink} from '../../helpers/mailpit';
import {PortalHomePage, SignUpPage, SignUpSuccessPage} from '../../helpers/portal-pages';
import {MemberDetailsPage, MembersPage} from '../../helpers/pages';
import type {Page} from '@playwright/test';
import {PostFactory, createPostFactory} from '../../helpers/data-factory';
import {expect, test} from '../../helpers/fixture';

const unique = () => Math.random().toString(36).slice(2, 10);

async function signupViaPortal(page: Page): Promise<{emailAddress: string; name: string}> {
    const homePage = new PortalHomePage(page);
    await homePage.goto();
    await homePage.openPortal();

    const signUpPage = new SignUpPage(page);
    const emailAddress = `test-${unique()}@ghost.org`;
    const name = `Member ${unique()}`;
    await signUpPage.fillAndSubmit(emailAddress, name);

    const successPage = new SignUpSuccessPage(page);
    await successPage.waitForSignUpSuccess();
    await successPage.closePortal();

    return {emailAddress, name};
}
test.describe('Ghost Public - Member Signup - Types', () => {
    let emailClient: MailPit;

    test.beforeEach(async ({baseURL}) => {
        emailClient = new MailPit(baseURL!);
    });

    async function finishSignupByMagicLinkInEmail(page: Page, emailAddress: string) {
        const messages = await emailClient.searchByRecipient(emailAddress);
        const latestMessage = await emailClient.getMessageDetailed(messages[0]);
        const emailTextBody = latestMessage.Text;

        const magicLink = extractMagicLink(emailTextBody);
        await page.goto(magicLink);
        await new PortalHomePage(page).waitUntilLoaded();
    }

    test('signed up with magic link - direct', async ({page}) => {
        await new PortalHomePage(page).goto();
        const {emailAddress, name} = await signupViaPortal(page);

        await finishSignupByMagicLinkInEmail(page, emailAddress);

        const homePage = new PortalHomePage(page);
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

        const homePage = new PortalHomePage(page);
        await homePage.goto();
        await page.getByRole('link', {name: post.title}).click();
        // Adapted: wait for the post page to finish loading so the deferred
        // attribution script records the visit before navigating away.
        await page.waitForLoadState('load');
        await page.waitForFunction(() => (sessionStorage.getItem('ghost-history') ?? '').length > 0);
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

        const homePage = new PortalHomePage(page);
        await homePage.goto('/', {referer: 'https://www.google.com', waitUntil: 'domcontentloaded'});
        await page.getByRole('link', {name: post.title}).click();
        // Adapted: wait for the post page to finish loading so the deferred
        // attribution script records the visit before navigating away.
        await page.waitForLoadState('load');
        await page.waitForFunction(() => (sessionStorage.getItem('ghost-history') ?? '').length > 0);
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

        const homePage = new PortalHomePage(page);
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

        const homePage = new PortalHomePage(page);
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
