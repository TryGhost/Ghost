import { PostEditorPage } from '@/admin-pages';
import { PostFactory, buildLexicalParagraph, createPostFactory } from '@/data-factory';
import { PostPage } from '@/helpers/pages';
import { expect, test, withIsolatedPage } from '@/helpers/playwright';
import type { Browser, Page } from '@playwright/test';

/**
 * The Code injection section of the React post editor's settings sidebar,
 * behind the `editorReact` Labs flag. The case edits a published post, saves
 * with Update, and follows the snippets the whole way round: what the server
 * holds, and where the theme's `{{ghost_head}}` and `{{ghost_foot}}` place
 * them in the rendered page. That placement is only observable against a
 * real Ghost.
 */

const POSTS_API = '/ghost/api/admin/posts/';

interface PostCodeInjection {
  codeinjection_head: string | null;
  codeinjection_foot: string | null;
}

async function readCodeInjection(page: Page, postId: string): Promise<PostCodeInjection> {
  const response = await page.request.get(`${POSTS_API}${postId}/`);
  expect(response.status()).toBe(200);
  const {
    posts: [post],
  } = await response.json();

  return {
    codeinjection_head: post.codeinjection_head,
    codeinjection_foot: post.codeinjection_foot,
  };
}

function waitForPostSave(page: Page, postId: string) {
  return page.waitForResponse(
    (response) =>
      response.request().method() === 'PUT' &&
      response.url().includes(`${POSTS_API}${postId}/`) &&
      response.status() === 200,
  );
}

/** Renders the post as an anonymous visitor and returns the page markup. */
async function renderPost(
  browser: Browser,
  baseURL: string | undefined,
  { slug, title }: { slug: string; title: string },
): Promise<string> {
  return withIsolatedPage(browser, { baseURL }, async ({ page: visitorPage }) => {
    const sitePost = new PostPage(visitorPage);
    await sitePost.gotoPost(slug);
    await expect(sitePost.articleTitle).toHaveText(title);
    return visitorPage.content();
  });
}

test.describe('Ghost Admin - Post editor code injection (React)', () => {
  // Flag state belongs on the describe — `test.use` inside a test body has no
  // effect on the fixtures that test already resolved.
  test.use({ labs: { editorReact: true } });

  let postFactory: PostFactory;

  test.beforeEach(async ({ page }) => {
    postFactory = createPostFactory(page.request);
  });

  test('published post - header and footer code reach the rendered page once updated, and clearing them removes both', async ({
    browser,
    baseURL,
    page,
  }) => {
    const stamp = Date.now();
    const title = `react-code-injection-${stamp}`;
    const headSnippet = `<meta name="x-e2e-head" content="${stamp}">`;
    const footSnippet = `<script type="application/json" id="x-e2e-foot">${stamp}</script>`;
    const created = await postFactory.create({
      title,
      status: 'published',
      lexical: buildLexicalParagraph('A paragraph the injected code sits around.'),
    });

    const editor = new PostEditorPage(page, { implementation: 'react' });
    await editor.gotoPost(created.id);
    const { settings } = editor;

    await settings.openSection('code-injection');
    await settings.codeInjection.setHead(headSnippet);
    await settings.codeInjection.setFoot(footSnippet);
    await expect(settings.codeInjection.headCode).toHaveText(headSnippet);
    await expect(settings.codeInjection.footCode).toHaveText(footSnippet);
    await settings.closeSection('code-injection');
    // A published post stages a settings edit until Update, so this click is
    // the only save
    await Promise.all([waitForPostSave(page, created.id), editor.header.updateButton.click()]);

    expect(await readCodeInjection(page, created.id)).toEqual({
      codeinjection_head: headSnippet,
      codeinjection_foot: footSnippet,
    });

    const injected = await renderPost(browser, baseURL, created);
    const headAt = injected.indexOf(headSnippet);
    expect(headAt).toBeGreaterThan(-1);
    expect(headAt).toBeLessThan(injected.indexOf('</head>'));
    const footAt = injected.indexOf(footSnippet);
    // `{{ghost_foot}}` is the last thing before the body closes, after the article
    expect(footAt).toBeGreaterThan(injected.lastIndexOf('</article>'));
    expect(footAt).toBeLessThan(injected.indexOf('</body>'));

    await settings.openSection('code-injection');
    await settings.codeInjection.setHead('');
    await settings.codeInjection.setFoot('');
    await expect(settings.codeInjection.headCode).toHaveText('');
    await expect(settings.codeInjection.footCode).toHaveText('');
    await settings.closeSection('code-injection');
    await Promise.all([waitForPostSave(page, created.id), editor.header.updateButton.click()]);

    // A field cleared back to empty is stored as no value
    expect(await readCodeInjection(page, created.id)).toEqual({
      codeinjection_head: null,
      codeinjection_foot: null,
    });

    const cleared = await renderPost(browser, baseURL, created);
    expect(cleared).not.toContain(headSnippet);
    expect(cleared).not.toContain(footSnippet);
  });
});
