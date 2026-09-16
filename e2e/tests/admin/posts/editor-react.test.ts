import { PostEditorPage, PostsPage } from '@/admin-pages';
import { PostFactory, createPostFactory } from '@/data-factory';
import { expect, test } from '@/helpers/playwright';
import type { Page } from '@playwright/test';

/**
 * The data-loss-critical draft journey through the **React** post editor,
 * behind the `editorReact` Labs flag.
 *
 * Every assertion here is about content surviving: the create that gives a new
 * draft its id, the autosaves that follow, and what the server actually holds
 * afterwards. Nothing asserts layout — the two editors are not intended to
 * look alike yet.
 *
 * The Ember editor keeps its own coverage in `lexical-editor.test.ts` and
 * `editor-session-expiry.test.ts`; the flag-off case (Ember serving
 * `/editor/post` with its hidden secondary instance) is already asserted
 * there, so it is not repeated.
 *
 * Autosaves are observed through the network: the chip says a save landed, not
 * which edit it carried. Only the explicit save is asserted on the chip.
 */

const POSTS_API = '/ghost/api/admin/posts/';

interface PostWrite {
  method: string;
  url: string;
  body: string;
}

/**
 * Every write the editor sends, in order. Recorded from the first navigation
 * so no save can land in the gap between an action and a `waitForResponse`.
 */
function recordPostWrites(page: Page): PostWrite[] {
  const writes: PostWrite[] = [];

  page.on('response', (response) => {
    const request = response.request();
    const method = request.method();

    if ((method === 'POST' || method === 'PUT') && response.url().includes(POSTS_API)) {
      writes.push({ method, url: response.url(), body: request.postData() ?? '' });
    }
  });

  return writes;
}

/** Requests are recorded at dispatch time so an in-flight duplicate cannot hide between waits. */
function recordPostWriteRequests(page: Page): PostWrite[] {
  const requests: PostWrite[] = [];

  page.on('request', (request) => {
    const method = request.method();

    if ((method === 'POST' || method === 'PUT') && request.url().includes(POSTS_API)) {
      requests.push({ method, url: request.url(), body: request.postData() ?? '' });
    }
  });

  return requests;
}

function writesCarrying(writes: PostWrite[], text: string): PostWrite[] {
  return writes.filter((write) => write.body.includes(text));
}

async function readPost(page: Page, postId: string) {
  const response = await page.request.get(`/ghost/api/admin/posts/${postId}/?formats=lexical`);
  expect(response.status()).toBe(200);
  const {
    posts: [post],
  } = await response.json();

  return post;
}

/**
 * Nothing more is written. A non-event can only be asserted over a window, and
 * this one has to outlast the 3s autosave debounce plus the request itself —
 * it is a bound on the assertion, not a wait for something to happen.
 */
async function expectNoFurtherWrites(page: Page): Promise<void> {
  await expect(
    page.waitForRequest(
      (request) =>
        (request.method() === 'POST' || request.method() === 'PUT') &&
        request.url().includes(POSTS_API),
      { timeout: 6000 },
    ),
  ).rejects.toThrow();
}

test.describe('Ghost Admin - Post editor (React)', () => {
  // Flag state belongs on the describe — `test.use` inside a test body has no
  // effect on the fixtures that test already resolved.
  test.use({ labs: { editorReact: true } });

  let postFactory: PostFactory;
  let editor: PostEditorPage;
  let writes: PostWrite[];

  test.beforeEach(async ({ page }) => {
    postFactory = createPostFactory(page.request);
    editor = new PostEditorPage(page, { implementation: 'react' });
    writes = recordPostWrites(page);
  });

  test('new draft - creates the post, keeps what was typed, and persists it', async ({ page }) => {
    // Create, a debounced autosave and a reload do not fit the default budget
    test.setTimeout(60000);

    const title = `react-new-draft-${Date.now()}`;
    const body = 'Typed into the React editor before it had an id.';

    const postsPage = new PostsPage(page);
    await postsPage.goto();
    await postsPage.newPostButton.click();
    await editor.titleInput.waitFor({ state: 'visible' });

    // Held across the URL swap below: a remount would replace this element
    const bodyBeforeCreate = await editor.lexicalEditor.elementHandle();

    const [createResponse] = await Promise.all([
      page.waitForResponse(
        (response) => response.request().method() === 'POST' && response.url().includes(POSTS_API),
      ),
      editor.createDraft({ title, body }),
    ]);
    expect(createResponse.ok()).toBeTruthy();

    // The acquired id replaces the URL in place; the editor must not remount
    const postId = await editor.getPostId();
    expect(await bodyBeforeCreate?.evaluate((node) => node.isConnected)).toBe(true);
    await expect(editor.titleInput).toHaveValue(title);
    await expect(editor.lexicalEditor).toContainText(body);

    // The create fires on the first keystroke, so the rest of the body rides a
    // later autosave
    await expect
      .poll(() => writesCarrying(writes, body).length, { timeout: 20000 })
      .toBeGreaterThan(0);

    await page.reload();
    await expect(editor.titleInput).toHaveValue(title);
    await expect(editor.lexicalEditor).toContainText(body);

    const post = await readPost(page, postId);
    expect(post.status).toBe('draft');
    expect(post.title).toBe(title);
    expect(post.lexical).toContain(body);
  });

  test('existing draft - autosaves a body edit and survives a reload', async ({ page }) => {
    test.setTimeout(60000);

    const created = await postFactory.create({
      title: `react-existing-draft-${Date.now()}`,
      status: 'draft',
      featured: false,
    });
    const addition = 'Appended in the React editor.';

    await editor.gotoPost(created.id);
    await expect(editor.lexicalEditor).toBeVisible();
    await editor.appendToBody(` ${addition}`);

    await expect
      .poll(() => writesCarrying(writes, addition).length, { timeout: 20000 })
      .toBeGreaterThan(0);
    // An existing draft is updated in place, never re-created
    expect(writes.every((write) => write.method === 'PUT')).toBe(true);

    await page.reload();
    await expect(editor.lexicalEditor).toContainText(addition);

    const post = await readPost(page, created.id);
    expect(post.status).toBe('draft');
    expect(post.lexical).toContain(addition);
  });

  test('explicit save - Cmd-S saves once, with a revision, and persists', async ({ page }) => {
    test.setTimeout(60000);

    const created = await postFactory.create({
      title: `react-explicit-save-${Date.now()}`,
      status: 'draft',
      featured: false,
    });
    const addition = 'Saved explicitly.';

    await editor.gotoPost(created.id);
    await expect(editor.lexicalEditor).toBeVisible();
    const writeRequests = recordPostWriteRequests(page);
    await editor.appendToBody(` ${addition}`);
    // The edit is on screen, so the session holds it and the autosave is armed
    await expect(editor.lexicalEditor).toContainText(addition);

    await page.keyboard.press('ControlOrMeta+s');

    // The explicit save cancels the armed autosave rather than following it,
    // so the edit reaches the server once, carrying a revision
    await expect.poll(() => writeRequests.length, { timeout: 20000 }).toBe(1);
    expect(writeRequests[0].method).toBe('PUT');
    expect(writeRequests[0].url).toContain('save_revision=true');
    expect(writeRequests[0].body).toContain(addition);

    await editor.waitForSaved();
    await expectNoFurtherWrites(page);
    expect(writeRequests).toHaveLength(1);

    await page.reload();
    await expect(editor.titleInput).toHaveValue(created.title);
    await expect(editor.lexicalEditor).toContainText(addition);

    const post = await readPost(page, created.id);
    expect(post.status).toBe('draft');
    expect(post.title).toBe(created.title);
    expect(post.lexical).toContain(addition);
  });

  test('title rename - reaches the server and leaves the draft clean', async ({ page }) => {
    test.setTimeout(60000);

    const created = await postFactory.create({
      title: `react-rename-before-${Date.now()}`,
      status: 'draft',
      featured: false,
    });
    const renamed = `react-rename-after-${Date.now()}`;

    await editor.gotoPost(created.id);
    await expect(editor.lexicalEditor).toBeVisible();

    await editor.titleInput.click();
    await editor.titleInput.fill(renamed);
    // The title saves on blur, which also settles the slug
    await editor.lexicalEditor.click();

    // Every write sends the whole post, so a slug round-trip carries the title
    // too; what matters is that the rename reached the server at all
    await expect
      .poll(() => writesCarrying(writes, renamed).length, { timeout: 20000 })
      .toBeGreaterThan(0);

    // A second blur cycle changes nothing, so a clean draft writes nothing.
    // A draft left dirty by its own rename — the slug coming back different
    // from what was sent — would save again here, and keep saving.
    await editor.titleInput.click();
    await editor.lexicalEditor.click();
    await expectNoFurtherWrites(page);

    const post = await readPost(page, created.id);
    expect(post.title).toBe(renamed);
    expect(post.status).toBe('draft');
  });
});
