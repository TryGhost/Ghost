import { describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { buildLexicalParagraph } from '@tryghost/test-data';

import {
  currentRoute,
  currentUserResponse,
  fakeAdminEndpoint,
  fakePosts,
  fakeSnippets,
  post,
  renderAdminApp,
  staffRole,
  type RenderAdminAppOptions,
} from '@test-utils/acceptance';
import { editorScreen } from '@/editor/editor.screen';

const POST_ID = 'abc123';
const FLAG_ON = { labs: { editorReact: true } };
const CURRENT_USER_ID = '1';

const MOBILEDOC =
  '{"version":"0.3.1","atoms":[],"cards":[],"markups":[],"sections":[[1,"p",[[0,[],0,"Legacy"]]]]}';

// Every editor mount browses snippets for the card menu and, through Koenig's
// link toolbar preload, the five latest published posts.
function fakeEditorChrome() {
  fakeSnippets([]);
  return fakePosts([]);
}

function fakeEditorPost(overrides: Partial<ReturnType<typeof post>> = {}) {
  fakeEditorChrome();
  return fakeAdminEndpoint('GET', new RegExp(`^/posts/${POST_ID}/\\?`), {
    posts: [
      post({
        id: POST_ID,
        title: 'Hello from React',
        custom_excerpt: 'A short summary',
        lexical: buildLexicalParagraph('Hello from React'),
        ...overrides,
      }),
    ],
  });
}

function bootAs(role: 'Author' | 'Contributor'): RenderAdminAppOptions {
  const me = currentUserResponse();
  me.users[0].roles = [staffRole({ name: role })];
  return { ...FLAG_ON, boot: { browseMe: { response: me } } };
}

function pasteText(content: string) {
  const dataTransfer = new DataTransfer();
  dataTransfer.setData('text/plain', content);
  document.activeElement?.dispatchEvent(
    new ClipboardEvent('paste', { clipboardData: dataTransfer, bubbles: true, cancelable: true }),
  );
}

/**
 * The React post editor behind the `editorReact` flag: loads the post,
 * mounts Koenig with its hidden secondary instance and keeps edits in memory.
 * Nothing is saved yet — any write request other than the mobiledoc
 * conversion would 418 and fail the test.
 */
describe('Post editor', () => {
  it('loads the post into the title and body', async () => {
    const postsApi = fakeEditorPost();
    await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);

    await expect.element(editorScreen.titleInput()).toHaveValue('Hello from React');
    await expect.element(editorScreen.body()).toHaveTextContent('Hello from React');
    await expect.element(editorScreen.wordCount()).toHaveTextContent('3 words');
    expect(postsApi.lastRequest?.url).toContain('formats=mobiledoc%2Clexical');
    expect(postsApi.lastRequest?.url).toContain('include=tags%2Cauthors');
  });

  it('mounts the hidden secondary Koenig instance without doubling its requests', async () => {
    const latestPostsApi = fakeEditorChrome();
    fakeAdminEndpoint('GET', new RegExp(`^/posts/${POST_ID}/\\?`), {
      posts: [post({ id: POST_ID, lexical: buildLexicalParagraph('Hello') })],
    });
    await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);

    await expect.element(editorScreen.body()).toBeVisible();
    await expect
      .element(editorScreen.secondaryInstance())
      .toHaveAttribute('data-secondary-instance', 'true');
    await expect.element(editorScreen.secondaryInstance()).not.toBeVisible();
    await expect.poll(() => latestPostsApi.requests.length).toBe(1);
    expect(latestPostsApi.lastRequest?.limit).toBe(5);
  });

  it('updates the word count as the body is edited', async () => {
    fakeEditorPost();
    await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);

    const body = editorScreen.body();
    await expect.element(editorScreen.wordCount()).toHaveTextContent('3 words');
    await body.click();
    await userEvent.keyboard('{End} and more');

    await expect.element(body).toHaveTextContent('Hello from React and more');
    await expect.element(editorScreen.wordCount()).toHaveTextContent('5 words');
  });

  it('keeps title edits in memory', async () => {
    fakeEditorPost();
    await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);

    const title = editorScreen.titleInput();
    await expect.element(title).toHaveValue('Hello from React');
    await title.fill('Changed title TK');

    await expect.element(title).toHaveValue('Changed title TK');
    await expect.element(editorScreen.titleTkIndicator()).toBeVisible();
  });

  it('moves from the title into the body on Enter and cleans pasted titles', async () => {
    fakeEditorPost();
    await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);

    const title = editorScreen.titleInput();
    await expect.element(editorScreen.body()).toHaveTextContent('Hello from React');
    await title.click();
    await userEvent.keyboard('{Enter}');

    await expect.poll(() => editorScreen.bodyHasFocus()).toBe(true);
    await expect.element(title).toHaveValue('Hello from React');

    await title.fill('');
    await title.click();
    pasteText('  Line one\nLine two\r\n\nLine three  ');

    await expect.element(title).toHaveValue('Line one Line two Line three');
  });

  it('shows the excerpt only behind the editorExcerpt flag', async () => {
    fakeEditorPost();
    await renderAdminApp(`/editor/post/${POST_ID}`, {
      labs: { editorReact: true, editorExcerpt: true },
    });

    await expect.element(editorScreen.excerptInput()).toHaveValue('A short summary');
  });

  it('hides the excerpt without the flag', async () => {
    fakeEditorPost();
    await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);

    await expect.element(editorScreen.titleInput()).toBeVisible();
    await expect(editorScreen.excerptInput()).toHaveCount(0);
  });

  it.each<['post' | 'page']>([['post'], ['page']])(
    'converts a mobiledoc %s to lexical before opening it',
    async (type) => {
      const resource = `${type}s`;
      const legacy = post({
        id: POST_ID,
        title: `Legacy ${type}`,
        mobiledoc: MOBILEDOC,
        lexical: null,
        updated_at: '2024-05-06T07:08:09.000Z',
      });
      fakeEditorChrome();
      fakeAdminEndpoint('GET', new RegExp(`^/${resource}/${POST_ID}/\\?`), {
        [resource]: [legacy],
      });
      const convertApi = fakeAdminEndpoint('PUT', new RegExp(`^/${resource}/${POST_ID}/\\?`), {
        [resource]: [
          post({
            ...legacy,
            mobiledoc: null,
            lexical: buildLexicalParagraph('Converted from mobiledoc'),
          }),
        ],
      });
      await renderAdminApp(`/editor/${type}/${POST_ID}`, FLAG_ON);

      await expect.element(editorScreen.body()).toHaveTextContent('Converted from mobiledoc');
      expect(convertApi.requests).toHaveLength(1);
      expect(convertApi.lastRequest?.url).toContain('convert_to_lexical=true');
      expect(convertApi.lastRequest?.url).toContain('formats=mobiledoc%2Clexical');
      const body = convertApi.lastRequest?.body as Record<string, unknown[]>;
      expect(body[resource]).toEqual([{ id: POST_ID, updated_at: legacy.updated_at }]);
    },
  );

  it('shows an error when the conversion response carries no post', async () => {
    fakeEditorPost({ title: 'Legacy post', mobiledoc: MOBILEDOC, lexical: null });
    fakeAdminEndpoint('PUT', new RegExp(`^/posts/${POST_ID}/\\?`), { posts: [] });
    await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);

    await expect
      .element(editorScreen.loadError())
      .toHaveTextContent('Couldn’t convert this post for editing.');
    await expect(editorScreen.body()).toHaveCount(0);
  });

  it('shows an error instead of an empty body when the conversion fails', async () => {
    fakeEditorPost({ title: 'Legacy post', mobiledoc: MOBILEDOC, lexical: null });
    fakeAdminEndpoint(
      'PUT',
      new RegExp(`^/posts/${POST_ID}/\\?`),
      { errors: [{ message: 'Invalid mobiledoc structure.' }] },
      { status: 422 },
    );
    await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);

    await expect
      .element(editorScreen.loadError())
      .toHaveTextContent('Couldn’t convert this post for editing.');
    await expect(editorScreen.body()).toHaveCount(0);
  });

  it('shows a 404 for a post that does not exist', async () => {
    fakeEditorChrome();
    fakeAdminEndpoint(
      'GET',
      new RegExp(`^/posts/${POST_ID}/\\?`),
      { errors: [{ message: 'Post not found.' }] },
      { status: 404 },
    );
    await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);

    await expect.element(editorScreen.notFound()).toBeVisible();
  });

  it('shows a 404 for an unknown editor type', async () => {
    await renderAdminApp('/editor/article/abc123', FLAG_ON);

    await expect.element(editorScreen.notFound()).toBeVisible();
  });

  type Role = 'Author' | 'Contributor';
  type Status = ReturnType<typeof post>['status'];

  it.each<[string, Role, 'post' | 'page', Status, string, string]>([
    ['author', 'Author', 'post', 'published', 'other-user', '/posts'],
    ['contributor', 'Contributor', 'post', 'draft', 'other-user', '/posts'],
    ['contributor', 'Contributor', 'page', 'published', CURRENT_USER_ID, '/pages'],
  ])(
    'returns a %s to the list for a %s %s they cannot edit',
    async (_role, role, type, status, authorId, listPath) => {
      fakeEditorChrome();
      fakeAdminEndpoint('GET', new RegExp(`^/${type}s/${POST_ID}/\\?`), {
        [`${type}s`]: [
          post({
            id: POST_ID,
            status,
            authors: [{ id: authorId }],
            mobiledoc: MOBILEDOC,
            lexical: null,
          }),
        ],
      });
      await renderAdminApp(`/editor/${type}/${POST_ID}`, bootAs(role));

      // a mobiledoc record must not be converted for a user who is redirected;
      // the PUT has no fake, so it would 418 and fail the test
      await expect.poll(currentRoute).toBe(listPath);
      await expect(editorScreen.root()).toHaveCount(0);
    },
  );

  it.each<[string, Role, Status]>([
    ['author', 'Author', 'published'],
    ['contributor', 'Contributor', 'draft'],
  ])('lets a %s edit their own %s post', async (_role, role, status) => {
    fakeEditorPost({ status, authors: [{ id: CURRENT_USER_ID }] });
    await renderAdminApp(`/editor/post/${POST_ID}`, bootAs(role));

    await expect.element(editorScreen.titleInput()).toHaveValue('Hello from React');
    expect(currentRoute()).toBe(`/editor/post/${POST_ID}`);
  });

  it('opens an empty editor for a new post', async () => {
    fakeEditorChrome();
    await renderAdminApp('/editor/post', FLAG_ON);

    await expect.element(editorScreen.titleInput()).toHaveValue('');
    await expect.element(editorScreen.titleInput()).toHaveAttribute('placeholder', 'Post title');
    await expect.element(editorScreen.body()).toBeVisible();
    await expect.element(editorScreen.wordCount()).toHaveTextContent('0 words');
  });

  it('labels a new page as a page', async () => {
    fakeEditorChrome();
    await renderAdminApp('/editor/page', FLAG_ON);

    await expect.element(editorScreen.titleInput()).toHaveAttribute('placeholder', 'Page title');
    await expect.element(editorScreen.backLink('page')).toHaveAttribute('href', '#/pages');
  });

  it('sends the bare editor URL to a new post', async () => {
    fakeEditorChrome();
    await renderAdminApp('/editor', FLAG_ON);

    await expect.poll(currentRoute).toBe('/editor/post');
    await expect.element(editorScreen.titleInput()).toHaveAttribute('placeholder', 'Post title');
  });
});
