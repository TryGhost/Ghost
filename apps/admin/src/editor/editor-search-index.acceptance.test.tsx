import type { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import type { useFetchApi } from '@tryghost/admin-x-framework/hooks';

import {
  fakeAdminEndpoint,
  fakeEditorChrome,
  fakeEditorPost,
  renderAdminApp,
  unsavedChangesGuarded,
  withFastAutosave,
} from '@test-utils/acceptance';
import { editorScreen } from '@/editor/editor.screen';
import { searchIndexQueryOptions } from '@/shared/search-index';

const POST_ID = 'abc123';
const FLAG_ON = withFastAutosave({ labs: { editorReact: true } });

/** The post as the posts list of the search index holds it when the editor opens. */
const LISTED = {
  id: POST_ID,
  title: 'Hello from React',
  slug: 'hello-from-react',
  status: 'draft',
  url: 'https://site.test/p/abc123/',
  visibility: 'public',
  published_at: null,
};

/** Reads the posts list the way editor links do: from the cache, unless it was invalidated. */
async function readPostsList(queryClient: QueryClient) {
  const read = async (url: string): Promise<unknown> => {
    const response = await fetch(url);
    return (await response.json()) as unknown;
  };
  const fetchApi = read as unknown as ReturnType<typeof useFetchApi>;
  await queryClient.fetchQuery(searchIndexQueryOptions('posts', fetchApi));
}

async function appendToBody(text: string) {
  const body = editorScreen.body();
  await expect.element(body).toBeVisible();
  await body.fill(`${body.element().textContent ?? ''}${text}`);
}

/**
 * Global search and editor links read every post on the site from one list, so an
 * edit refreshes it only when it changes something the list holds.
 */
describe('Post editor search index', () => {
  it('keeps the posts list across a body save, and refreshes it after a title change', async () => {
    fakeEditorChrome();
    fakeAdminEndpoint('GET', /^\/slugs\/post\//, ({ url }) => ({
      slugs: [{ slug: decodeURIComponent(url.split('/slugs/post/')[1].split('/')[0]) }],
    }));
    const saveApi = fakeEditorPost({ url: LISTED.url, visibility: 'public' });
    const list = fakeAdminEndpoint('GET', '/search-index/posts/', { posts: [LISTED] });
    const { queryClient } = await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
    await expect.element(editorScreen.titleInput()).toHaveValue('Hello from React');
    await readPostsList(queryClient);
    expect(list.requests).toHaveLength(1);

    await appendToBody(' and more');
    await expect.poll(() => saveApi.requests.length).toBe(1);
    await expect.poll(unsavedChangesGuarded).toBe(false);
    await readPostsList(queryClient);

    expect(list.requests).toHaveLength(1);

    await editorScreen.titleInput().fill('A new title');
    await userEvent.keyboard('{Meta>}s{/Meta}');
    await expect.poll(() => saveApi.requests.length).toBe(2);
    await expect.poll(unsavedChangesGuarded).toBe(false);
    await readPostsList(queryClient);

    expect(list.requests).toHaveLength(2);
  });
});
