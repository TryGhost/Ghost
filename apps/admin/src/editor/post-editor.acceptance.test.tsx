import { describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { buildLexicalParagraph } from '@tryghost/test-data';

import {
  fakeAdminEndpoint,
  fakePosts,
  fakeSnippets,
  post,
  renderAdminApp,
} from '@test-utils/acceptance';
import { editorScreen } from '@/editor/editor.screen';

const POST_ID = 'abc123';
const FLAG_ON = { labs: { editorReact: true } };

// Every editor mount browses snippets for the card menu and, through Koenig's
// link toolbar preload, the five latest published posts.
function fakeEditorChrome() {
  fakeSnippets([]);
  fakePosts([]);
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

/**
 * The React post editor behind the `editorReact` flag: loads the post,
 * mounts Koenig with its hidden secondary instance and keeps edits in memory.
 * Nothing is saved yet — any write request would 418 and fail the test.
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

  it('mounts the hidden secondary Koenig instance', async () => {
    fakeEditorPost();
    await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);

    await expect.element(editorScreen.body()).toBeVisible();
    await expect
      .element(editorScreen.secondaryInstance())
      .toHaveAttribute('data-secondary-instance', 'true');
    await expect.element(editorScreen.secondaryInstance()).not.toBeVisible();
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
});
