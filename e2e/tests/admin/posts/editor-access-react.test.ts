import { Browser, Page } from '@playwright/test';
import {
  Member,
  MemberFactory,
  PostFactory,
  TierFactory,
  buildLexicalParagraph,
  createMemberFactory,
  createPostFactory,
  createTierFactory,
} from '@/data-factory';
import { PostEditorPage, PostsPage } from '@/admin-pages';
import { PostPage } from '@/helpers/pages';
import { expect, test, withIsolatedPage } from '@/helpers/playwright';
import { signInAsMember } from '@/helpers/playwright/flows/sign-in';

/**
 * The Access section of the React post editor's settings sidebar, behind the
 * `editorReact` Labs flag. Each case follows one visibility choice the whole
 * way round: what the writer picks, what the server holds afterwards, and what
 * the site shows an anonymous visitor and a member the choice lets in. The
 * acceptance tier stops at the request; whether Ghost honours the value is
 * only observable here.
 */

const POSTS_API = '/ghost/api/admin/posts/';

/** The options as the Access select shows them. */
const SPECIFIC_TIERS = 'Specific tier(s)';
const MEMBERS_ONLY = 'Members only';

async function readAccess(page: Page, postId: string) {
  const response = await page.request.get(`${POSTS_API}${postId}/?include=tiers`);
  expect(response.status()).toBe(200);
  const {
    posts: [post],
  } = await response.json();

  return {
    status: post.status as string,
    visibility: post.visibility as string,
    slug: post.slug as string,
    tierIds: (post.tiers as { id: string }[]).map((tier) => tier.id),
  };
}

/** Every paid tier the site offers, which is what the tier picker lists. */
async function readPaidTiers(page: Page): Promise<{ id: string; name: string }[]> {
  const response = await page.request.get('/ghost/api/admin/tiers/?filter=type:paid&limit=all');
  expect(response.status()).toBe(200);
  const { tiers } = await response.json();

  return tiers.map((tier: { id: string; name: string }) => ({
    id: tier.id,
    name: tier.name,
  }));
}

function waitForPostSave(page: Page, postId: string) {
  return page.waitForResponse(
    (response) =>
      response.request().method() === 'PUT' &&
      response.url().includes(`${POSTS_API}${postId}/`) &&
      response.status() === 200,
  );
}

/** Renders the post as a signed-in member and returns the page HTML. */
async function readPostAsMember(
  browser: Browser,
  baseURL: string,
  member: Member,
  slug: string,
): Promise<{ html: string; ctaCount: number }> {
  return withIsolatedPage(
    browser,
    { baseURL, extraHTTPHeaders: { Origin: baseURL } },
    async ({ page: memberPage }) => {
      await signInAsMember(memberPage, member);
      const sitePost = new PostPage(memberPage);
      await sitePost.gotoPost(slug);
      await expect(sitePost.articleTitle).toBeVisible();

      return {
        html: await memberPage.content(),
        ctaCount: await sitePost.accessCtaContent.count(),
      };
    },
  );
}

async function startDraft(page: Page, { title, body }: { title: string; body: string }) {
  const postsPage = new PostsPage(page);
  await postsPage.goto();
  await postsPage.newPostButton.click();

  const editor = new PostEditorPage(page, { implementation: 'react' });
  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        response.url().includes(POSTS_API) &&
        response.status() === 201,
    ),
    editor.createDraft({ title, body }),
  ]);

  return { editor, postId: await editor.getPostId() };
}

test.describe('Ghost Admin - Post editor access (React)', () => {
  // Flag state belongs on the describe — `test.use` inside a test body has no
  // effect on the fixtures that test already resolved.
  test.use({ labs: { editorReact: true } });

  let memberFactory: MemberFactory;
  let postFactory: PostFactory;
  let tierFactory: TierFactory;

  test.beforeEach(async ({ page }) => {
    memberFactory = createMemberFactory(page.request);
    postFactory = createPostFactory(page.request);
    tierFactory = createTierFactory(page.request);
  });

  test.describe('with Stripe connected', () => {
    test.use({ stripeEnabled: true });

    test('new post - Specific tier(s) publishes gated to the ticked tier', async ({
      browser,
      baseURL,
      page,
    }) => {
      const stamp = Date.now();
      const title = `react-access-tiers-${stamp}`;
      const body = 'Only the ticked tier may read this.';
      const [ticked, other] = await Promise.all([
        tierFactory.create({
          name: `Gold ${stamp}`,
          currency: 'usd',
          monthly_price: 1000,
          yearly_price: 10000,
        }),
        tierFactory.create({
          name: `Silver ${stamp}`,
          currency: 'usd',
          monthly_price: 500,
          yearly_price: 5000,
        }),
      ]);
      const member = await memberFactory.create({
        email: `gold-${stamp}@example.com`,
        status: 'comped',
        tiers: [{ id: ticked.id }],
      });

      const { editor, postId } = await startDraft(page, { title, body });
      const { settings } = editor;

      await settings.openSection('access');
      await settings.access.setVisibility(SPECIFIC_TIERS);
      // The picker opens with every paid tier ticked, the site's own default
      // tier included, so one tier is an untick of all the others
      await settings.access.selectTier(ticked.name);
      const others = (await readPaidTiers(page)).filter((tier) => tier.id !== ticked.id);
      for (const tier of others) {
        await settings.access.deselectTier(tier.name);
      }
      await expect(settings.access.tier(ticked.name)).toBeChecked();
      await expect(settings.access.tier(other.name)).not.toBeChecked();

      await editor.publishFlow.open();
      await expect(editor.publishFlow.optionsStep).toBeVisible();
      await editor.publishFlow.confirm();
      await expect(editor.publishFlow.completeStep).toBeVisible();

      const published = await readAccess(page, postId);
      expect(published).toMatchObject({
        status: 'published',
        visibility: 'tiers',
        tierIds: [ticked.id],
      });

      await withIsolatedPage(browser, { baseURL }, async ({ page: visitorPage }) => {
        const sitePost = new PostPage(visitorPage);
        await sitePost.gotoPost(published.slug);
        await expect(sitePost.articleTitle).toHaveText(title);
        await expect(sitePost.accessCtaHeading).toContainText(`on the ${ticked.name} tier only`);
        expect(await visitorPage.content()).not.toContain(body);
      });

      const asMember = await readPostAsMember(browser, baseURL!, member, published.slug);
      expect(asMember.html).toContain(body);
      expect(asMember.ctaCount).toBe(0);
    });
  });

  test('published post - Members only gates the body and keeps the title and excerpt', async ({
    browser,
    baseURL,
    page,
  }) => {
    const stamp = Date.now();
    const title = `react-access-members-${stamp}`;
    const excerpt = `Read on for react-access-members-${stamp}.`;
    const body = 'Only members may read this.';
    const created = await postFactory.create({
      title,
      status: 'published',
      custom_excerpt: excerpt,
      lexical: buildLexicalParagraph(body),
    });
    expect((await readAccess(page, created.id)).visibility).toBe('public');
    const member = await memberFactory.create({
      email: `free-${stamp}@example.com`,
      status: 'free',
    });

    const editor = new PostEditorPage(page, { implementation: 'react' });
    await editor.gotoPost(created.id);
    const { settings } = editor;

    await settings.openSection('access');
    await settings.access.setVisibility(MEMBERS_ONLY);
    // A published post stages a settings edit until Update, so this click is
    // the only save
    await Promise.all([waitForPostSave(page, created.id), editor.publishSaveButton.click()]);

    const updated = await readAccess(page, created.id);
    expect(updated).toMatchObject({
      status: 'published',
      visibility: 'members',
    });

    await withIsolatedPage(browser, { baseURL }, async ({ page: visitorPage }) => {
      const sitePost = new PostPage(visitorPage);
      await sitePost.gotoPost(created.slug);
      await expect(sitePost.articleTitle).toHaveText(title);
      await expect(visitorPage.getByText(excerpt)).toBeVisible();
      await expect(sitePost.accessCtaContent).toBeVisible();
      expect(await visitorPage.content()).not.toContain(body);
    });

    const asMember = await readPostAsMember(browser, baseURL!, member, created.slug);
    expect(asMember.html).toContain(body);
    expect(asMember.ctaCount).toBe(0);
  });
});
