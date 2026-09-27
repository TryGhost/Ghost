import { EGRESS_MOCK_RESPONSE_HEADER } from '@/helpers/environment/constants';
import {
  Member,
  MemberFactory,
  PostFactory,
  TagFactory,
  buildLexicalParagraph,
  createMemberFactory,
  createPostFactory,
  createTagFactory,
} from '@/data-factory';
import { PostEditorPage, PostsPage } from '@/admin-pages';
import { PostPage } from '@/helpers/pages';
import { SettingsService } from '@/helpers/services/settings/settings-service';
import { expect, test, withIsolatedPage } from '@/helpers/playwright';
import { postHistoryLatestText } from '@tryghost/test-data/selectors/editor';
import { signInAsMember } from '@/helpers/playwright/flows/sign-in';
import type { Browser, Page } from '@playwright/test';

/**
 * Smoke round trips through the React post editor's settings sidebar, behind
 * the `editorReact` Labs flag. Each case touches many sections in one pass and
 * proves them with one Admin API read and one site render; field-level cases
 * belong to the acceptance tier.
 */

const POSTS_API = '/ghost/api/admin/posts/';
const IMAGES_API = '/ghost/api/admin/images/upload/';
const USERS_API = '/ghost/api/admin/users/';
const UNSPLASH_API = 'https://api.unsplash.com';

const SITE_TIMEZONE = 'Pacific/Auckland';
// An early morning under New Zealand daylight time (UTC+13), so the UTC instant
// falls on the previous calendar day
const LOCAL_DAY = '2026-03-10';
const LOCAL_TIME = '05:30';
const EXPECTED_INSTANT = '2026-03-09T16:30:00.000Z';
/** The theme's `DD MMM YYYY`, in the site timezone. */
const LOCAL_DAY_LABEL = '10 Mar 2026';

/** The option as the Access select shows it. */
const MEMBERS_ONLY = 'Members only';

/** A 1x1 PNG, which Ghost accepts as an image upload. */
const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

interface UnsplashPhoto {
  id: string;
  alt: string;
  /** The URL the picker hands the editor, as `urls.regular`. */
  url: string;
  photographer: string;
  photographerUrl: string;
}

interface PostTag {
  name: string;
  slug: string;
  visibility: string;
}

interface Revision {
  title: string;
  lexical: string | null;
  created_at_ts: number;
}

interface StaffUser {
  id: string;
  name: string;
  email: string;
}

async function readPost(page: Page, postId: string, query = '') {
  const response = await page.request.get(`${POSTS_API}${postId}/${query}`);
  expect(response.status()).toBe(200);
  const {
    posts: [post],
  } = await response.json();

  return post;
}

/** The post's versions newest first, by the millisecond stamp `created_at_ts`. */
async function readPostHistory(page: Page, postId: string) {
  const post = await readPost(page, postId, '?formats=lexical&include=post_revisions');
  const revisions = (post.post_revisions as Revision[])
    .map((revision) => ({
      title: revision.title,
      lexical: revision.lexical,
      createdAtTs: revision.created_at_ts,
    }))
    .sort((a, b) => b.createdAtTs - a.createdAtTs);

  return { title: post.title as string, lexical: post.lexical as string, revisions };
}

/** Writes fields the factory does not carry; the PUT needs `updated_at` to pass collision detection. */
async function updatePost(page: Page, postId: string, fields: Record<string, unknown>) {
  const current = await readPost(page, postId);
  const response = await page.request.put(`${POSTS_API}${postId}/`, {
    data: { posts: [{ ...fields, updated_at: current.updated_at }] },
  });
  expect(response.status()).toBe(200);
}

/** The staff member behind an email, as the authors picker lists them. */
async function findStaffByEmail(page: Page, email: string): Promise<StaffUser> {
  const response = await page.request.get(`${USERS_API}?limit=all`);
  expect(response.status()).toBe(200);
  const { users } = await response.json();
  const user = (users as StaffUser[]).find((candidate) => candidate.email === email);
  if (!user) {
    throw new Error(`No staff user with email ${email}`);
  }

  return { id: user.id, name: user.name, email: user.email };
}

function waitForPostSave(page: Page, postId: string) {
  return page.waitForResponse(
    (response) =>
      response.request().method() === 'PUT' &&
      response.url().includes(`${POSTS_API}${postId}/`) &&
      response.status() === 200,
  );
}

/** The save Cmd-S sends, which is the one that asks the server for a version. */
function waitForRevisionSave(page: Page, postId: string) {
  return page.waitForResponse(
    (response) =>
      response.request().method() === 'PUT' &&
      response.url().includes(`${POSTS_API}${postId}/`) &&
      response.url().includes('save_revision=true') &&
      response.status() === 200,
  );
}

function waitForPostDelete(page: Page, postId: string) {
  return page.waitForResponse(
    (response) =>
      response.request().method() === 'DELETE' &&
      response.url().includes(`${POSTS_API}${postId}/`) &&
      response.status() === 204,
  );
}

/** Uploads through the API and returns the absolute URL Ghost serves it from. */
async function uploadImage(page: Page, name: string): Promise<string> {
  const response = await page.request.post(IMAGES_API, {
    multipart: {
      file: { name, mimeType: 'image/png', buffer: PNG_1X1 },
      purpose: 'image',
    },
  });
  expect(response.status()).toBe(201);
  const {
    images: [image],
  } = await response.json();

  return image.url as string;
}

/** The API and the site both carry absolute image URLs, so only the file name is fixed. */
function storedAs(name: string): RegExp {
  return new RegExp(`/${name.replace(/\./g, '\\.')}$`);
}

/** A photo in the shape Unsplash's API returns, with every value the picker reads stamped. */
function unsplashPhotoResponse(photo: UnsplashPhoto) {
  return {
    id: photo.id,
    slug: photo.id,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    promoted_at: null,
    width: 1200,
    height: 800,
    color: '#f0f0f0',
    blur_hash: 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH',
    description: null,
    alt_description: photo.alt,
    breadcrumbs: [],
    urls: {
      raw: photo.url,
      full: photo.url,
      regular: photo.url,
      small: photo.url,
      thumb: photo.url,
    },
    links: {
      self: `${UNSPLASH_API}/photos/${photo.id}`,
      html: `https://unsplash.com/photos/${photo.id}`,
      download: `https://unsplash.com/photos/${photo.id}/download`,
      download_location: `${UNSPLASH_API}/photos/${photo.id}/download`,
    },
    likes: 1,
    liked_by_user: false,
    current_user_collections: [],
    sponsorship: null,
    topic_submissions: {},
    user: {
      id: `user-${photo.id}`,
      updated_at: '2026-01-01T00:00:00Z',
      username: photo.id,
      name: photo.photographer,
      first_name: photo.photographer,
      last_name: '',
      twitter_username: null,
      portfolio_url: null,
      bio: null,
      location: null,
      links: {
        self: `${UNSPLASH_API}/users/${photo.id}`,
        html: photo.photographerUrl,
        photos: `${UNSPLASH_API}/users/${photo.id}/photos`,
        likes: `${UNSPLASH_API}/users/${photo.id}/likes`,
        portfolio: `${UNSPLASH_API}/users/${photo.id}/portfolio`,
      },
      profile_image: { small: photo.url, medium: photo.url, large: photo.url },
      instagram_username: null,
      total_collections: 0,
      total_likes: 0,
      total_photos: 1,
      accepted_tos: true,
      for_hire: false,
      social: {
        instagram_username: null,
        portfolio_url: null,
        twitter_username: null,
        paypal_email: null,
      },
    },
  };
}

/**
 * Answers the picker's Unsplash API calls with `photo` alone and aborts every
 * other request to an Unsplash host, recording it, so nothing reaches Unsplash.
 * The photo's own URL is on the site under test: Ghost probes a remote feature
 * image's dimensions at render, which would send the server to Unsplash.
 */
async function stubUnsplash(page: Page, photo: UnsplashPhoto): Promise<{ escaped: string[] }> {
  const escaped: string[] = [];
  const body = unsplashPhotoResponse(photo);
  const responses: Record<string, unknown> = {
    '/photos': [body],
    '/search/photos': { results: [body] },
    [`/photos/${photo.id}/download`]: { url: photo.url },
  };

  await page.route(
    (url) => url.hostname === 'unsplash.com' || url.hostname.endsWith('.unsplash.com'),
    async (route) => {
      const url = new URL(route.request().url());
      const response = url.origin === UNSPLASH_API ? responses[url.pathname] : undefined;
      if (response === undefined) {
        escaped.push(url.toString());
        await route.abort();
        return;
      }
      await route.fulfill({
        body: JSON.stringify(response),
        contentType: 'application/json',
        headers: { [EGRESS_MOCK_RESPONSE_HEADER]: '1' },
      });
    },
  );

  return { escaped };
}

/** Starts a new draft from the list and returns it once its first save has given it an id. */
async function startDraft(page: Page, { title, body }: { title: string; body: string }) {
  const postsPage = new PostsPage(page, { implementation: 'react' });
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

/** Publishes the open draft and dismisses the flow so the editor is reachable again. */
async function publish(page: Page, editor: PostEditorPage, postId: string): Promise<void> {
  await editor.publishFlow.open();
  await expect(editor.publishFlow.optionsStep).toBeVisible();
  await Promise.all([waitForPostSave(page, postId), editor.publishFlow.confirm()]);
  await expect(editor.publishFlow.completeStep).toBeVisible();
  await editor.publishFlow.dismiss();
}

/** The tag names the page head carries, in the order Ghost writes them. */
function headTagNames(sitePost: PostPage): Promise<(string | null)[]> {
  return sitePost.articleTagMetas.evaluateAll((metas) =>
    metas.map((meta) => meta.getAttribute('content')),
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

test.describe('Ghost Admin - Post editor settings (React)', () => {
  // Flag state belongs on the describe — `test.use` inside a test body has no
  // effect on the fixtures that test already resolved. Delete leaves for the
  // list through the router, which only the React list follows.
  test.use({ labs: { editorReact: true, postsListReact: true } });

  let memberFactory: MemberFactory;
  let postFactory: PostFactory;
  let tagFactory: TagFactory;

  test.beforeEach(async ({ page }) => {
    memberFactory = createMemberFactory(page.request);
    postFactory = createPostFactory(page.request);
    tagFactory = createTagFactory(page.request);
  });

  test('new draft - every section saves as it is committed, publishes once, and reaches the API and the site', async ({
    browser,
    baseURL,
    page,
    ghostAccountOwner,
    ghostAccountAuthor,
  }) => {
    const stamp = Date.now();
    const title = `react-settings-draft-${stamp}`;
    const body = 'A paragraph every setting hangs off.';
    const seededTitle = `Seeded URL ${stamp}`;
    const seededSlug = `seeded-url-${stamp}`;
    const dedupedSlug = `${seededSlug}-2`;
    const stampedTag = { name: `Stamped Tag ${stamp}`, slug: `stamped-tag-${stamp}` };
    const internalTag = { name: `#stamped-${stamp}`, slug: `hash-stamped-${stamp}` };
    const metaTitle = `Search title ${stamp}`;
    const metaDescription = `The description search engines read for ${stamp}.`;
    const xTitle = `X title ${stamp}`;
    const facebookTitle = `Facebook title ${stamp}`;
    const headSnippet = `<meta name="x-e2e-head" content="${stamp}">`;
    const footSnippet = `<script type="application/json" id="x-e2e-foot">${stamp}</script>`;
    const imageName = `unsplash-${stamp}.png`;
    const alt = `Alt text for the Unsplash pick ${stamp}`;

    // Admin edits in the timezone it booted with and gates the Unsplash button
    // on the setting it booted with, so only a reload picks the new values up
    await new SettingsService(page.request).updateSettings([
      { key: 'timezone', value: SITE_TIMEZONE },
      { key: 'unsplash', value: true },
    ]);
    await page.reload({ waitUntil: 'load' });

    const [seededTag, owner, second, photoUrl] = await Promise.all([
      tagFactory.create({ name: `Seeded Tag ${stamp}` }),
      findStaffByEmail(page, ghostAccountOwner.email),
      findStaffByEmail(page, ghostAccountAuthor.email),
      uploadImage(page, imageName),
      postFactory.create({
        title: seededTitle,
        slug: seededSlug,
        status: 'published',
        lexical: buildLexicalParagraph('The post that owns the slug.'),
      }),
    ]);
    const photo: UnsplashPhoto = {
      id: `e2e-${stamp}`,
      alt: `Stubbed Unsplash photo ${stamp}`,
      url: photoUrl,
      photographer: `Photographer ${stamp}`,
      photographerUrl: `https://unsplash.com/@e2e-${stamp}`,
    };
    const { escaped } = await stubUnsplash(page, photo);

    const { editor, postId } = await startDraft(page, { title, body });
    const { settings, featureImage } = editor;

    // A draft saves each committed field on its own, so every commit is awaited
    await settings.openSection('tags');
    await Promise.all([waitForPostSave(page, postId), settings.tags.add(seededTag.name)]);
    await Promise.all([waitForPostSave(page, postId), settings.tags.add(stampedTag.name)]);
    await Promise.all([waitForPostSave(page, postId), settings.tags.add(internalTag.name)]);

    await settings.openSection('authors');
    await Promise.all([waitForPostSave(page, postId), settings.authors.add(second.name)]);

    await settings.openSection('url');
    await Promise.all([waitForPostSave(page, postId), settings.url.setSlug(seededSlug)]);
    await expect(settings.url.slugInput).toHaveValue(dedupedSlug);

    await settings.openSection('meta-data');
    await Promise.all([waitForPostSave(page, postId), settings.metaData.setTitle(metaTitle)]);
    await Promise.all([
      waitForPostSave(page, postId),
      settings.metaData.setDescription(metaDescription),
    ]);

    await settings.openSection('x-card');
    await Promise.all([waitForPostSave(page, postId), settings.xCard.setTitle(xTitle)]);

    await settings.openSection('facebook-card');
    await Promise.all([
      waitForPostSave(page, postId),
      settings.facebookCard.setTitle(facebookTitle),
    ]);

    await settings.openSection('code-injection');
    await Promise.all([waitForPostSave(page, postId), settings.codeInjection.setHead(headSnippet)]);
    await Promise.all([waitForPostSave(page, postId), settings.codeInjection.setFoot(footSnippet)]);

    await settings.openSection('publish-date');
    await Promise.all([waitForPostSave(page, postId), settings.publishDate.setDate(LOCAL_DAY)]);
    await Promise.all([waitForPostSave(page, postId), settings.publishDate.setTime(LOCAL_TIME)]);
    await expect(settings.publishDate.error).toHaveCount(0);
    await settings.close();

    await featureImage.openUnsplash();
    await Promise.all([waitForPostSave(page, postId), featureImage.insertUnsplashPhoto(photo.alt)]);
    await Promise.all([waitForPostSave(page, postId), featureImage.setAlt(alt)]);

    await publish(page, editor, postId);

    const saved = await readPost(page, postId, '?include=tags,authors');
    expect(saved).toMatchObject({
      status: 'published',
      slug: dedupedSlug,
      meta_title: metaTitle,
      meta_description: metaDescription,
      twitter_title: xTitle,
      og_title: facebookTitle,
      codeinjection_head: headSnippet,
      codeinjection_foot: footSnippet,
      published_at: EXPECTED_INSTANT,
      feature_image_alt: alt,
    });
    expect(saved.feature_image).toMatch(storedAs(imageName));
    expect(
      (saved.tags as PostTag[]).map(({ name, slug, visibility }) => ({ name, slug, visibility })),
    ).toEqual([
      { name: seededTag.name, slug: seededTag.slug, visibility: 'public' },
      { ...stampedTag, visibility: 'public' },
      { ...internalTag, visibility: 'internal' },
    ]);
    expect((saved.authors as { id: string }[]).map((author) => author.id)).toEqual([
      owner.id,
      second.id,
    ]);
    expect(saved.primary_author.id).toBe(owner.id);

    await withIsolatedPage(browser, { baseURL }, async ({ page: visitorPage }) => {
      const { escaped: escapedFromSite } = await stubUnsplash(visitorPage, photo);
      const sitePost = new PostPage(visitorPage);
      await sitePost.gotoPost(dedupedSlug);
      await expect(sitePost.articleTitle).toHaveText(title);
      await expect(visitorPage).toHaveTitle(metaTitle);
      await expect(sitePost.metaDescription).toHaveAttribute('content', metaDescription);
      await expect(sitePost.socialMetaTag('og:title')).toHaveAttribute('content', facebookTitle);
      await expect(sitePost.socialMetaTag('twitter:title')).toHaveAttribute('content', xTitle);
      // The theme shows the primary tag; the head carries the public ones and never the internal
      expect(await headTagNames(sitePost)).toEqual([seededTag.name, stampedTag.name]);
      await expect(sitePost.articleTag).toHaveText(seededTag.name);
      await expect(sitePost.articleAuthorName).toHaveText(`${owner.name}, ${second.name}`);
      await expect(sitePost.articleHeader).toContainText(LOCAL_DAY_LABEL);
      await expect(visitorPage.getByRole('img', { name: alt })).toHaveAttribute(
        'src',
        storedAs(imageName),
      );

      const html = await visitorPage.content();
      expect(html).not.toContain(internalTag.name);
      const headAt = html.indexOf(headSnippet);
      expect(headAt).toBeGreaterThan(-1);
      expect(headAt).toBeLessThan(html.indexOf('</head>'));
      // `{{ghost_foot}}` is the last thing before the body closes, after the article
      const footAt = html.indexOf(footSnippet);
      expect(footAt).toBeGreaterThan(html.lastIndexOf('</article>'));
      expect(footAt).toBeLessThan(html.indexOf('</body>'));

      // The deduped slug left the seeded post where it was
      await sitePost.gotoPost(seededSlug);
      await expect(sitePost.articleTitle).toHaveText(seededTitle);
      expect(escapedFromSite).toEqual([]);
    });

    expect(escaped).toEqual([]);
  });

  test('published post - Access, meta and X card changes land on Update, gate the site, and Delete removes the post', async ({
    browser,
    baseURL,
    page,
  }) => {
    const stamp = Date.now();
    const title = `react-settings-published-${stamp}`;
    const body = 'Only members may read this.';
    const metaTitle = `Search title ${stamp}`;
    const xTitle = `X title ${stamp}`;
    const featureImageName = `feature-${stamp}.png`;
    const xImageName = `x-card-${stamp}.png`;
    const facebookImageName = `facebook-card-${stamp}.png`;
    const [featureImage, xImage, facebookImage] = await Promise.all([
      uploadImage(page, featureImageName),
      uploadImage(page, xImageName),
      uploadImage(page, facebookImageName),
    ]);
    const [created, member] = await Promise.all([
      postFactory.create({
        title,
        status: 'published',
        feature_image: featureImage,
        lexical: buildLexicalParagraph(body),
      }),
      memberFactory.create({ email: `free-${stamp}@example.com`, status: 'free' }),
    ]);
    await updatePost(page, created.id, { twitter_image: xImage, og_image: facebookImage });

    const editor = new PostEditorPage(page, { implementation: 'react' });
    await editor.gotoPost(created.id);
    const { settings } = editor;

    await settings.openSection('access');
    await settings.access.setVisibility(MEMBERS_ONLY);
    await settings.openSection('meta-data');
    await settings.metaData.setTitle(metaTitle);
    await settings.openSection('x-card');
    await settings.xCard.setTitle(xTitle);
    await settings.xCard.removeImageButton.click();
    await expect(settings.xCard.removeImageButton).toBeHidden();
    await settings.closeSection('x-card');
    // A published post stages every settings edit until Update, so this click
    // is the only save
    await Promise.all([waitForPostSave(page, created.id), editor.header.updateButton.click()]);

    const updated = await readPost(page, created.id);
    expect(updated).toMatchObject({
      status: 'published',
      visibility: 'members',
      meta_title: metaTitle,
      twitter_title: xTitle,
      twitter_image: null,
    });
    expect(updated.og_image).toMatch(storedAs(facebookImageName));
    expect(updated.feature_image).toMatch(storedAs(featureImageName));

    await withIsolatedPage(browser, { baseURL }, async ({ page: visitorPage }) => {
      const sitePost = new PostPage(visitorPage);
      await sitePost.gotoPost(created.slug);
      await expect(sitePost.articleTitle).toHaveText(title);
      await expect(visitorPage).toHaveTitle(metaTitle);
      await expect(sitePost.accessCtaContent).toBeVisible();
      expect(await visitorPage.content()).not.toContain(body);
      // With no X image of its own the card takes the feature image; the Facebook card keeps its own
      await expect(sitePost.socialMetaTag('twitter:image')).toHaveAttribute(
        'content',
        storedAs(featureImageName),
      );
      await expect(sitePost.socialMetaTag('og:image')).toHaveAttribute(
        'content',
        storedAs(facebookImageName),
      );
    });

    const asMember = await readPostAsMember(browser, baseURL!, member, created.slug);
    expect(asMember.html).toContain(body);
    expect(asMember.ctaCount).toBe(0);

    await settings.openSection('delete');
    await Promise.all([waitForPostDelete(page, created.id), settings.delete.deletePost()]);

    const postsPage = new PostsPage(page, { implementation: 'react' });
    await postsPage.waitForPageToFullyLoad();
    await expect(postsPage.postsListItem.first()).toBeVisible();
    await expect(postsPage.getPostByTitle(title)).toHaveCount(0);
    expect((await page.request.get(`${POSTS_API}${created.id}/`)).status()).toBe(404);
    await expect.poll(async () => (await page.request.get(`/${created.slug}/`)).status()).toBe(404);
  });

  test('draft - restoring an older version from Post history brings it back and saves it as the newest', async ({
    page,
  }) => {
    const stamp = Date.now();
    const firstTitle = `react-history-first-${stamp}`;
    const firstBody = 'The paragraph the first version keeps.';
    const secondTitle = `react-history-second-${stamp}`;
    const secondBody = 'The paragraph the second version replaces it with.';

    const { editor, postId } = await startDraft(page, { title: firstTitle, body: firstBody });

    // The history orders versions by the second written, so each save waits
    // out the status hold before the next
    await editor.waitForSaved();
    await Promise.all([waitForRevisionSave(page, postId), page.keyboard.press('ControlOrMeta+s')]);
    await editor.waitForSaved();

    await editor.titleInput.fill(secondTitle);
    await editor.replaceBody(secondBody);
    await expect(editor.lexicalEditor).not.toContainText(firstBody);
    await Promise.all([waitForRevisionSave(page, postId), page.keyboard.press('ControlOrMeta+s')]);
    await editor.waitForSaved();

    const saved = await readPostHistory(page, postId);
    expect(saved.revisions[0].title).toBe(secondTitle);
    expect(saved.revisions[0].lexical).toContain(secondBody);
    expect(saved.revisions[1].title).toBe(firstTitle);
    expect(saved.revisions[1].lexical).toContain(firstBody);

    const { history } = editor.settings.postHistory;
    await editor.settings.openSection('post-history');
    await expect(history.revisions).toHaveCount(saved.revisions.length);
    await expect(history.revision(0).row).toContainText(postHistoryLatestText);
    await expect(history.revision(0).restoreButton).toHaveCount(0);
    await history.revision(1).select();
    await expect(history.previewTitle).toHaveText(firstTitle);
    await history.restore(1);

    await expect(editor.titleInput).toHaveValue(firstTitle);
    await expect(editor.lexicalEditor).toContainText(firstBody);
    await expect(editor.lexicalEditor).not.toContainText(secondBody);

    // The restore is saved as a version of its own, ahead of the ones it chose from
    const restored = await readPostHistory(page, postId);
    expect(restored.title).toBe(firstTitle);
    expect(restored.lexical).toContain(firstBody);
    expect(restored.lexical).not.toContain(secondBody);
    expect(restored.revisions).toHaveLength(saved.revisions.length + 1);
    expect(restored.revisions[0].title).toBe(firstTitle);

    await page.reload();
    await expect(editor.titleInput).toHaveValue(firstTitle);
    await expect(editor.lexicalEditor).toContainText(firstBody);
  });
});
