import {Browser, BrowserContext, Page} from '@playwright/test';
import {Member, buildLexicalParagraph, createMemberFactory, createPostFactory, createTierFactory} from '@/data-factory';
import {PostPage} from '@/helpers/pages';
import {expect, test} from '@/helpers/playwright';
import {signInAsMember} from '@/helpers/playwright/flows/sign-in';

async function createAuthenticatedPublicPage(browser: Browser, baseURL: string, member: Member): Promise<{context: BrowserContext; page: Page; postPage: PostPage}> {
    const context = await browser.newContext({
        baseURL,
        extraHTTPHeaders: {
            Origin: baseURL
        }
    });
    const page = await context.newPage();
    await signInAsMember(page, member);

    return {
        context,
        page,
        postPage: new PostPage(page)
    };
}

test.describe('Ghost Admin - Post Visibility', () => {
    test('members-only post shows subscriber gate', async ({page}) => {
        const title = `members-only-post-${Date.now()}`;
        const body = 'This is my members-only post body.';

        const postFactory = createPostFactory(page.request);
        const post = await postFactory.create({
            title,
            status: 'published',
            visibility: 'members',
            lexical: buildLexicalParagraph(body)
        });

        const publicPage = new PostPage(page);
        await publicPage.gotoPost(post.slug);
        await expect(publicPage.accessCtaHeading).toHaveText('This post is for subscribers only');
    });

    test('paid-members-only post shows paid subscriber gate', async ({page}) => {
        const title = `paid-members-only-post-${Date.now()}`;
        const body = 'This is my paid-members-only post body.';

        const postFactory = createPostFactory(page.request);
        const post = await postFactory.create({
            title,
            status: 'published',
            visibility: 'paid',
            lexical: buildLexicalParagraph(body)
        });

        const publicPage = new PostPage(page);
        await publicPage.gotoPost(post.slug);
        await expect(publicPage.accessCtaHeading).toHaveText('This post is for paying subscribers only');
    });

    test.describe('specific tier visibility', () => {
        test.use({stripeEnabled: true});

        test('only allows selected tier members', async ({page, browser}) => {
            const timestamp = Date.now();
            const title = `gold-tier-post-${timestamp}`;
            const body = 'Only gold members can see this';

            const tierFactory = createTierFactory(page.request);
            const memberFactory = createMemberFactory(page.request);

            const [disallowedTier, allowedTier] = await Promise.all([
                tierFactory.create({
                    name: `Silver ${timestamp}`,
                    currency: 'usd',
                    monthly_price: 500,
                    yearly_price: 5000
                }),
                tierFactory.create({
                    name: `Gold ${timestamp}`,
                    currency: 'usd',
                    monthly_price: 1000,
                    yearly_price: 10000
                })
            ]);

            const [disallowedMember, allowedMember] = await Promise.all([
                memberFactory.create({
                    email: `silver-tier-${timestamp}@example.com`,
                    name: 'Silver Member',
                    status: 'comped',
                    tiers: [{id: disallowedTier.id}]
                }),
                memberFactory.create({
                    email: `gold-tier-${timestamp}@example.com`,
                    name: 'Gold Member',
                    status: 'comped',
                    tiers: [{id: allowedTier.id}]
                })
            ]);

            const postFactory = createPostFactory(page.request);
            const post = await postFactory.create({
                title,
                status: 'published',
                visibility: 'tiers',
                tiers: [{id: allowedTier.id}],
                lexical: buildLexicalParagraph(body)
            });

            const accessMessage = `on the ${allowedTier.name} tier only`;
            const slug = post.slug;

            const anonymousPage = await page.context().newPage();
            try {
                const anonymousPostPage = new PostPage(anonymousPage);
                await anonymousPostPage.gotoPost(slug);
                await expect(anonymousPostPage.accessCtaHeading).toContainText(accessMessage);
            } finally {
                await anonymousPage.close();
            }

            const baseURL = new URL(page.url()).origin;
            const disallowedSession = await createAuthenticatedPublicPage(browser, baseURL, disallowedMember);
            const allowedSession = await createAuthenticatedPublicPage(browser, baseURL, allowedMember);

            try {
                await disallowedSession.postPage.gotoPost(slug);
                await expect(disallowedSession.postPage.accessCtaHeading).toContainText(accessMessage);

                await allowedSession.postPage.gotoPost(slug);
                await expect(allowedSession.postPage.accessCtaContent).toBeHidden();
                await expect(allowedSession.postPage.articleBody).toHaveText(body);
            } finally {
                await disallowedSession.context.close();
                await allowedSession.context.close();
            }
        });
    });
});
