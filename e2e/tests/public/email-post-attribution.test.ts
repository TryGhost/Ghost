import {EmailClient, MailPit} from '@/helpers/services/email/mail-pit';
import {HomePage, PublicPage} from '@/public-pages';
import {MemberDetailsPage, MembersPage} from '@/admin-pages';
import {Page} from '@playwright/test';
import {PostFactory, createPostFactory} from '@/data-factory';
import {expect, signupViaPortal, test} from '@/helpers/playwright';
import {extractMagicLink} from '@/helpers/services/email/utils';

/**
 * Tests for member signup attribution from email-only posts.
 *
 * Email-only posts are sent via newsletter but not published on the site.
 * They are accessible via the /email/{uuid}/ route ("view in browser" link).
 *
 * These tests verify that when a user signs up after visiting an email post
 * via /email/{uuid}?ref=ghost-newsletter, the attribution is correctly
 * assigned to the email post.
 */
test.describe('Ghost Public - Email Post Attribution', () => {
    let emailClient: EmailClient;

    test.beforeEach(async () => {
        emailClient = new MailPit();
    });

    async function finishSignupByMagicLinkInEmail(page: Page, emailAddress: string) {
        const messages = await emailClient.searchByRecipient(emailAddress);
        const latestMessage = await emailClient.getMessageDetailed(messages[0]);
        const emailTextBody = latestMessage.Text;

        const magicLink = extractMagicLink(emailTextBody);
        const publicPage = new PublicPage(page);
        await publicPage.goto(magicLink);
        await new HomePage(page).waitUntilLoaded();
    }

    test('signed up from email post view-in-browser link', async ({page}) => {
        // Arrange: Create an email-only (sent) post
        const postFactory: PostFactory = createPostFactory(page.request);

        // Ghost creates a default newsletter on setup, use its slug
        const defaultNewsletterSlug = 'default-newsletter';

        // Create email-only post and publish with newsletter
        const sentPost = await postFactory.createSentPost({
            title: 'Email Only Newsletter Post',
            newsletterSlug: defaultNewsletterSlug
        });

        // Verify the post has 'sent' status
        expect(sentPost.status).toBe('sent');

        // Act: Visit the email post via /email/{uuid}?ref=ghost-newsletter
        // This simulates clicking "view in browser" link from an email
        const publicPage = new PublicPage(page);
        await publicPage.goto(`/email/${sentPost.uuid}?ref=ghost-newsletter`);

        // Sign up via portal from this email post page
        const {emailAddress, name} = await signupViaPortal(page);

        // Complete signup via magic link
        await finishSignupByMagicLinkInEmail(page, emailAddress);

        // Assert: Check attribution in admin
        const membersPage = new MembersPage(page);
        await membersPage.goto();
        await membersPage.clickMemberByEmail(emailAddress);

        const membersDetailsPage = new MemberDetailsPage(page);

        // Verify the signup is attributed to the email post
        await expect(membersDetailsPage.body).toContainText(/Source.*—.*ghost newsletter/);
        await expect(membersDetailsPage.body).toContainText(/Page.*—.*Email Only Newsletter Post/);
        await expect(membersDetailsPage.nameInput).toHaveValue(name);
    });

    test('email post attribution is correctly linked to post not just URL', async ({page}) => {
        // This test verifies that attribution uses the post entity, not just the URL
        // This is important for analytics to correctly attribute conversions
        const postFactory: PostFactory = createPostFactory(page.request);

        const sentPost = await postFactory.createSentPost({
            title: 'Attribution Test Post',
            newsletterSlug: 'default-newsletter'
        });

        // Visit the email post
        const publicPage = new PublicPage(page);
        await publicPage.goto(`/email/${sentPost.uuid}?ref=ghost-newsletter`);

        const {emailAddress} = await signupViaPortal(page);
        await finishSignupByMagicLinkInEmail(page, emailAddress);

        const membersPage = new MembersPage(page);
        await membersPage.goto();
        await membersPage.clickMemberByEmail(emailAddress);

        const membersDetailsPage = new MemberDetailsPage(page);

        // The attribution should show the post title, indicating it's linked
        // to the post entity rather than just storing a URL
        await expect(membersDetailsPage.body).toContainText(/Page.*—.*Attribution Test Post/);
    });
});
