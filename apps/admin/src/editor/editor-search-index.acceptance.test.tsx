import type { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import type { useFetchApi } from '@tryghost/admin-x-framework/hooks';
import { buildLexicalParagraph, post, tag, type Post } from '@tryghost/test-data';

import {
  fakeAdminEndpoint,
  fakeEditorChrome,
  fakeEditorPost,
  renderAdminApp,
  unsavedChangesGuarded,
  withFastAutosave,
} from '@test-utils/acceptance';
import { editorScreen } from '@/editor/editor.screen';
import { searchIndexQueryOptions, type SearchIndexKey } from '@/shared/search-index';

const POST_ID = 'abc123';

/** The post as the search index lists it when the editor opens. */
const LISTED = {
  id: POST_ID,
  title: 'Hello from React',
  slug: 'hello-from-react',
  status: 'draft',
  url: 'https://site.test/p/abc123/',
  visibility: 'public',
  published_at: null,
};
const OTHER = { ...LISTED, id: 'other', title: 'Another post', slug: 'another-post' };
const NEWS = { id: 't1', slug: 'news', name: 'News', url: 'https://site.test/tag/news/' };

/** Reads one list the way editor links do: from the cache, unless it was invalidated. */
async function readList(queryClient: QueryClient, key: SearchIndexKey) {
  const read = async (url: string): Promise<unknown> => {
    const response = await fetch(url);
    return (await response.json()) as unknown;
  };
  const fetchApi = read as unknown as ReturnType<typeof useFetchApi>;
  const data = await queryClient.fetchQuery(searchIndexQueryOptions(key, fetchApi));
  return data[key] ?? [];
}

function fakeSlugs() {
  fakeAdminEndpoint('GET', /^\/slugs\/post\//, ({ url }) => ({
    slugs: [{ slug: decodeURIComponent(url.split('/slugs/post/')[1].split('/')[0]) }],
  }));
}

/** A page whose saves are stored and answered, as fakeEditorPost does for a post. */
function fakeEditorPage() {
  let current = post({
    id: POST_ID,
    title: 'Hello from React',
    slug: 'hello-from-react',
    status: 'draft',
    url: LISTED.url,
    visibility: 'public',
    lexical: buildLexicalParagraph('Hello from React'),
    updated_at: '2026-01-01T00:00:00.000Z',
    published_at: null,
  });
  const route = new RegExp(`^/pages/${POST_ID}/\\?`);
  fakeAdminEndpoint('GET', route, () => ({ pages: [current] }));
  return fakeAdminEndpoint('PUT', route, ({ body }) => {
    current = {
      ...current,
      ...(body as { pages: Partial<Post>[] }).pages[0],
      updated_at: new Date(Date.parse(current.updated_at) + 1000).toISOString(),
    };
    return { pages: [current] };
  });
}

async function appendToBody(text: string) {
  const body = editorScreen.body();
  await expect.element(body).toBeVisible();
  await body.fill(`${body.element().textContent ?? ''}${text}`);
}

async function saveTitle(title: string) {
  await editorScreen.titleInput().fill(title);
  await userEvent.keyboard('{Meta>}s{/Meta}');
}

/**
 * Global search and editor links read every post, page and tag on the site from
 * one list each, so a save writes what it changed into the loaded lists instead
 * of reading them again.
 */
describe('Post editor search index', () => {
  it('keeps the posts list loaded across saves, and shows the new title first', async () => {
    fakeEditorChrome();
    fakeSlugs();
    const saveApi = fakeEditorPost({ url: LISTED.url, visibility: 'public' });
    const list = fakeAdminEndpoint('GET', '/search-index/posts/', { posts: [OTHER, LISTED] });
    const { queryClient } = await renderAdminApp(`/editor/post/${POST_ID}`, withFastAutosave());
    await expect.element(editorScreen.titleInput()).toHaveValue('Hello from React');
    await readList(queryClient, 'posts');

    await appendToBody(' and more');
    await expect.poll(() => saveApi.requests.length).toBe(1);
    await expect.poll(unsavedChangesGuarded).toBe(false);
    await saveTitle('A new title');
    await expect.poll(() => saveApi.requests.length).toBe(2);
    await expect.poll(unsavedChangesGuarded).toBe(false);

    const posts = await readList(queryClient, 'posts');
    expect(list.requests).toHaveLength(1);
    expect(posts.map(({ id, title }) => ({ id, title }))).toEqual([
      { id: POST_ID, title: 'A new title' },
      { id: OTHER.id, title: OTHER.title },
    ]);
  });

  it('writes a page’s new title into the pages list without reading it again', async () => {
    fakeEditorChrome();
    fakeSlugs();
    const saveApi = fakeEditorPage();
    const list = fakeAdminEndpoint('GET', '/search-index/pages/', { pages: [LISTED] });
    const { queryClient } = await renderAdminApp(`/editor/page/${POST_ID}`, withFastAutosave());
    await expect.element(editorScreen.titleInput()).toHaveValue('Hello from React');
    await readList(queryClient, 'pages');

    await saveTitle('A new page title');
    await expect.poll(() => saveApi.requests.length).toBe(1);
    await expect.poll(unsavedChangesGuarded).toBe(false);

    const pages = await readList(queryClient, 'pages');
    expect(list.requests).toHaveLength(1);
    expect(pages[0]).toMatchObject({ id: POST_ID, title: 'A new page title' });
  });

  it('adds a tag the save created to the tags list without reading it again', async () => {
    fakeEditorChrome();
    fakeSlugs();
    const created = {
      id: 't2',
      slug: 'launch',
      name: 'Launch',
      url: 'https://site.test/tag/launch/',
    };
    // The server answers the save with a tag the list has never seen.
    const saveApi = fakeEditorPost({ url: LISTED.url, tags: [] }, (saved) => ({
      ...saved,
      tags: [tag(created)],
    }));
    const list = fakeAdminEndpoint('GET', '/search-index/tags/', { tags: [NEWS] });
    const { queryClient } = await renderAdminApp(`/editor/post/${POST_ID}`, withFastAutosave());
    await expect.element(editorScreen.titleInput()).toHaveValue('Hello from React');
    await readList(queryClient, 'tags');

    await appendToBody(' and more');
    await expect.poll(() => saveApi.requests.length).toBe(1);
    await expect.poll(unsavedChangesGuarded).toBe(false);

    const tags = await readList(queryClient, 'tags');
    expect(list.requests).toHaveLength(1);
    expect(tags).toMatchObject([created, NEWS]);
  });
});
