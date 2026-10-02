import { APIRequestContext, Page } from '@playwright/test';
import { LoginPage, PostEditorPage, PostsPage } from '@/admin-pages';
import { PostFactory, createMemberFactory, createPostFactory } from '@/data-factory';
import { PostPage } from '@/helpers/pages';
import { expect, test, withIsolatedPage } from '@/helpers/playwright';

/**
 * The publishing journeys through the React post editor, behind the
 * `editorReact` Labs flag. Each case pins the state the server ends up holding,
 * not the layout the editor reaches it through. The draft autosave journeys
 * stay in `editor-react.test.ts`.
 */

const POSTS_API = '/ghost/api/admin/posts/';
const PAGES_API = '/ghost/api/admin/pages/';

async function readPost(page: Page, postId: string) {
  const response = await page.request.get(`${POSTS_API}${postId}/?formats=lexical&include=email`);
  expect(response.status()).toBe(200);
  const {
    posts: [post],
  } = await response.json();

  return post;
}

function waitForPostSave(page: Page, postId: string, api = POSTS_API) {
  return page.waitForResponse(
    (response) =>
      response.request().method() === 'PUT' &&
      response.url().includes(`${api}${postId}/`) &&
      response.status() === 200,
  );
}

async function readPage(page: Page, pageId: string) {
  const response = await page.request.get(`${PAGES_API}${pageId}/`);
  expect(response.status()).toBe(200);
  const {
    pages: [found],
  } = await response.json();

  return found;
}

/** A draft page, opened in the React editor. */
async function openDraftPage(page: Page, title: string) {
  const response = await page.request.post(PAGES_API, {
    data: { pages: [{ title, status: 'draft' }] },
  });
  expect(response.status()).toBe(201);
  const {
    pages: [draft],
  } = await response.json();

  const editor = new PostEditorPage(page, { implementation: 'react' });
  await page.goto(`/ghost/#/editor/page/${draft.id}`);
  await editor.titleInput.waitFor({ state: 'visible' });

  return { editor, draft: draft as { id: string; slug: string } };
}

async function getNewsletters(request: APIRequestContext): Promise<{ id: string }[]> {
  const response = await request.get('/ghost/api/admin/newsletters/?status=active&limit=all');
  const data = await response.json();
  return data.newsletters.map((newsletter: { id: string }) => ({ id: newsletter.id }));
}

/** A member on every active newsletter, so email is on offer in the publish flow. */
async function addSubscribedMember(page: Page, email: string) {
  const memberFactory = createMemberFactory(page.request);
  const newsletters = await getNewsletters(page.request);
  await memberFactory.create({ email, name: 'React publishing member', newsletters });
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

  return { editor, postId: await editor.getPostId(), postsPage };
}

test.describe('Ghost Admin - Publishing (React)', () => {
  // Flag state belongs on the describe — `test.use` inside a test body has no
  // effect on the fixtures that test already resolved.
  test.use({ labs: { editorReact: true } });

  let postFactory: PostFactory;

  test.beforeEach(async ({ page }) => {
    postFactory = createPostFactory(page.request);
  });

  test('draft - schedules, lists as scheduled, and unschedules back to a draft', async ({
    page,
  }) => {
    // A schedule, a trip through the list and a revert do not fit the default
    // budget
    test.setTimeout(90000);

    const title = `react-schedule-${Date.now()}`;
    const body = 'This is my scheduled post body.';

    const { editor, postId, postsPage } = await startDraft(page, { title, body });

    await editor.publishFlow.open();
    await expect(editor.publishFlow.optionsStep).toBeVisible();
    // No date or time: the default schedule is ten minutes out
    await editor.publishFlow.schedule({});
    await Promise.all([waitForPostSave(page, postId), editor.publishFlow.confirm()]);
    await expect(page).toHaveURL('/ghost/#/posts');

    const scheduled = await readPost(page, postId);
    expect(scheduled.status).toBe('scheduled');

    // The list consumes the handoff and opens its celebration over itself.
    const listFlow = new PostEditorPage(page, { implementation: 'ember' }).publishFlow;
    await expect(listFlow.celebration).toBeVisible();
    await listFlow.close();
    await postsPage.waitForPageToFullyLoad();
    await expect(postsPage.getPostByTitle(title)).toContainText('Scheduled');
    await postsPage.getPostByTitle(title).click();
    await expect(editor.postStatus).toContainText('Scheduled');

    await editor.revertToDraft();
    await expect(editor.postStatus).toContainText('Draft');

    const reverted = await readPost(page, postId);
    expect(reverted.status).toBe('draft');
    expect(reverted.published_at).toBeNull();
  });

  test('published - an edit reaches the server when Update is clicked', async ({ page }) => {
    const created = await postFactory.create({
      title: `react-update-${Date.now()}`,
      status: 'published',
    });
    const addition = 'Edited after publishing.';

    const editor = new PostEditorPage(page, { implementation: 'react' });
    await editor.gotoPost(created.id);
    await expect(editor.lexicalEditor).toBeVisible();

    await editor.appendToBody(` ${addition}`);
    // A published post never autosaves, so this click is the only save
    await Promise.all([waitForPostSave(page, created.id), editor.publishSaveButton.click()]);

    const updated = await readPost(page, created.id);
    expect(updated.status).toBe('published');
    expect(updated.lexical).toContain(addition);
  });

  test('published - unpublishing takes the post off the site', async ({ page }) => {
    const title = `react-unpublish-${Date.now()}`;
    const created = await postFactory.create({ title, status: 'published' });

    const editor = new PostEditorPage(page, { implementation: 'react' });
    await editor.gotoPost(created.id);
    await expect(editor.postStatus).toContainText('Published');

    await editor.revertToDraft();
    await expect(editor.postStatus).toContainText('Draft');

    const reverted = await readPost(page, created.id);
    expect(reverted.status).toBe('draft');

    const frontendPage = await page.context().newPage();
    await expect
      .poll(async () => (await frontendPage.request.get(`/${created.slug}/`)).status(), {
        timeout: 20000,
      })
      .toBe(404);
  });

  test('page - publishing puts the page on the site', async ({ page }) => {
    const title = `react-page-publish-${Date.now()}`;
    const { editor, draft } = await openDraftPage(page, title);

    await editor.publishFlow.open();
    await expect(editor.publishFlow.optionsStep).toBeVisible();
    await Promise.all([waitForPostSave(page, draft.id, PAGES_API), editor.publishFlow.confirm()]);
    await expect(page).toHaveURL('/ghost/#/pages');

    const published = await readPage(page, draft.id);
    expect(published.status).toBe('published');

    const frontendPage = await page.context().newPage();
    const publicPage = new PostPage(frontendPage);
    await publicPage.gotoPost(draft.slug);
    await expect(publicPage.articleTitle).toHaveText(title);
  });

  test('page - scheduling keeps the page off the site until its time', async ({ page }) => {
    const { editor, draft } = await openDraftPage(page, `react-page-schedule-${Date.now()}`);

    await editor.publishFlow.open();
    await expect(editor.publishFlow.optionsStep).toBeVisible();
    await editor.publishFlow.schedule({});
    await Promise.all([waitForPostSave(page, draft.id, PAGES_API), editor.publishFlow.confirm()]);
    await expect(page).toHaveURL('/ghost/#/pages');

    const scheduled = await readPage(page, draft.id);
    expect(scheduled.status).toBe('scheduled');
    expect(Date.parse(scheduled.published_at)).toBeGreaterThan(Date.now());
    expect((await page.request.get(`/${draft.slug}/`)).status()).toBe(404);
  });

  test('draft - previewing saves the pending edit before it renders', async ({ page }) => {
    // The save, the modal and the frontend render of the preview do not fit the
    // default budget
    test.setTimeout(60000);

    const created = await postFactory.create({
      title: `react-preview-${Date.now()}`,
      status: 'draft',
      featured: false,
    });
    const addition = 'Typed but not yet saved.';

    const editor = new PostEditorPage(page, { implementation: 'react' });
    await editor.gotoPost(created.id);
    await expect(editor.lexicalEditor).toBeVisible();

    await editor.appendToBody(` ${addition}`);
    await editor.previewButton.click();
    await expect(editor.previewModal.modal).toBeVisible();

    const preview = editor.previewModal.desktopPreview;
    // The frame is rendered only once the save the preview waited on has landed
    await expect(preview.frameElement).toBeVisible();
    await preview.waitForPreviewModalFrame();

    const post = await readPost(page, created.id);
    expect(post.lexical).toContain(addition);
    await expect(preview.frameElement).toHaveAttribute('src', new RegExp(`/p/${post.uuid}/`));
    await expect(preview.desktopPreviewFrame.getByRole('article').first()).toContainText(addition);
  });

  test('contributor - gets Save and Preview and no way to publish', async ({
    browser,
    baseURL,
    page,
    ghostAccountContributor,
  }) => {
    // Inviting the contributor and signing them in does not fit the default
    // budget
    test.setTimeout(90000);

    const title = `react-contributor-${Date.now()}`;
    // Authored through the API rather than the editor: the React editor's
    // create payload omits `authors`, which a contributor's add permission needs
    const created = await page.request.post(POSTS_API, {
      data: {
        posts: [{ title, status: 'draft', authors: [{ email: ghostAccountContributor.email }] }],
      },
    });
    expect(created.status()).toBe(201);
    const {
      posts: [draft],
    } = await created.json();

    await withIsolatedPage(browser, { baseURL }, async ({ page: contributorPage }) => {
      const loginPage = new LoginPage(contributorPage);
      await loginPage.goto();
      await loginPage.signIn(ghostAccountContributor.email, ghostAccountContributor.password);

      const postsPage = new PostsPage(contributorPage);
      await postsPage.waitForPageToFullyLoad();

      const editor = new PostEditorPage(contributorPage, { implementation: 'react' });
      await editor.gotoPost(draft.id);
      await expect(editor.lexicalEditor).toBeVisible();

      await expect(editor.publishSaveButton).toBeVisible();
      await expect(editor.previewButton).toBeVisible();
      await expect(editor.publishFlow.publishButton).toHaveCount(0);
      await expect(editor.updateFlowButton).toHaveCount(0);
    });
  });

  // Both cases need email genuinely on offer, so the publish type is a real
  // choice rather than the only one left.
  test.describe('with a newsletter', () => {
    test.use({ mailgunEnabled: true });

    test('draft - publish only puts the post on the site and sends no email', async ({ page }) => {
      // A member, a draft and the three publish steps do not fit the default
      // budget
      test.setTimeout(90000);

      const title = `react-publish-only-${Date.now()}`;
      const body = 'This is my published post body.';

      await addSubscribedMember(page, 'react-publish-only@example.com');

      const { editor, postId } = await startDraft(page, { title, body });

      await editor.publishFlow.open();
      await expect(editor.publishFlow.optionsStep).toBeVisible();
      await editor.publishFlow.selectPublishType('publish');
      await editor.publishFlow.confirm();
      await expect(page).toHaveURL('/ghost/#/posts');

      const post = await readPost(page, postId);
      expect(post.status).toBe('published');
      // The send was on offer and the publish type declined it
      expect(post.email).toBeNull();

      const frontendPage = await page.context().newPage();
      const publicPage = new PostPage(frontendPage);
      await publicPage.gotoPost(post.slug);
      await expect(publicPage.articleTitle).toHaveText(title);
      await expect(publicPage.articleBody).toHaveText(body);
    });

    test('draft - publish and send delivers the email to the member', async ({
      emailClient,
      page,
    }) => {
      // A member, a publish flow and the send do not fit the default budget
      test.setTimeout(90000);

      const title = `react-publish-send-${Date.now()}`;
      const body = 'This is my emailed post body.';
      const memberEmail = 'react-publish-send@example.com';

      await addSubscribedMember(page, memberEmail);

      const { editor, postId } = await startDraft(page, { title, body });

      await editor.publishFlow.open();
      await expect(editor.publishFlow.optionsStep).toBeVisible();
      await editor.publishFlow.selectPublishType('publish+send');
      await editor.publishFlow.confirm();
      await expect(page).toHaveURL(`/ghost/#/posts/analytics/${postId}`);

      const post = await readPost(page, postId);
      expect(post.status).toBe('published');
      expect(post.email).not.toBeNull();

      const delivered = await emailClient.search(
        { to: memberEmail, subject: title },
        { timeoutMs: 30_000 },
      );
      expect(delivered.length).toBeGreaterThanOrEqual(1);

      const detail = await emailClient.getMessageDetailed(delivered[0]);
      expect(detail.HTML).toContain(body);
    });

    test('draft - email only delivers the email and keeps the post off the site', async ({
      emailClient,
      page,
    }) => {
      // A member, a publish flow and the send do not fit the default budget
      test.setTimeout(90000);

      const title = `react-email-only-${Date.now()}`;
      const body = 'This is my email-only post body.';
      const memberEmail = 'react-email-only@example.com';

      await addSubscribedMember(page, memberEmail);

      const { editor, postId } = await startDraft(page, { title, body });

      await editor.publishFlow.open();
      await expect(editor.publishFlow.optionsStep).toBeVisible();
      await editor.publishFlow.selectPublishType('send');
      await editor.publishFlow.confirm();
      await expect(page).toHaveURL(`/ghost/#/posts/analytics/${postId}`);

      const post = await readPost(page, postId);
      expect(post.status).toBe('sent');
      expect(post.email_only).toBe(true);
      expect(post.email).not.toBeNull();
      expect((await page.request.get(`/${post.slug}/`)).status()).toBe(404);

      const delivered = await emailClient.search(
        { to: memberEmail, subject: title },
        { timeoutMs: 30_000 },
      );
      expect(delivered.length).toBeGreaterThanOrEqual(1);

      const detail = await emailClient.getMessageDetailed(delivered[0]);
      expect(detail.HTML).toContain(body);
    });

    test('draft - scheduled email only holds the send and keeps the post off the site', async ({
      page,
    }) => {
      // A member, a draft and a scheduled flow do not fit the default budget
      test.setTimeout(90000);

      const title = `react-scheduled-email-only-${Date.now()}`;

      await addSubscribedMember(page, 'react-scheduled-email-only@example.com');

      const { editor, postId } = await startDraft(page, {
        title,
        body: 'This is my scheduled email-only post body.',
      });

      await editor.publishFlow.open();
      await expect(editor.publishFlow.optionsStep).toBeVisible();
      await editor.publishFlow.selectPublishType('send');
      await editor.publishFlow.schedule({});
      await Promise.all([waitForPostSave(page, postId), editor.publishFlow.confirm()]);
      // A scheduled send has nothing to report yet, so the flow returns to the list
      await expect(page).toHaveURL('/ghost/#/posts');

      const post = await readPost(page, postId);
      expect(post.status).toBe('scheduled');
      expect(post.email_only).toBe(true);
      expect(Date.parse(post.published_at)).toBeGreaterThan(Date.now());
      expect(post.email).toBeNull();
      expect((await page.request.get(`/${post.slug}/`)).status()).toBe(404);
    });
  });
});
