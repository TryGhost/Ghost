import moment from 'moment-timezone';
import { beforeEach, describe, expect, it, onTestFinished } from 'vitest';
import { page } from 'vitest/browser';
import {
  currentRoute,
  currentUserResponse,
  fakeAdminEndpoint,
  renderAdminApp,
  staffRole,
  type CapturedEndpointRequest,
} from '@test-utils/acceptance';
import { LOCAL_REVISION_PREFIX } from '@/editor/local-revisions';
import { sidebarScreen } from '@/layout/sidebar.screen';
import { restoreScreen } from '@/editor/restore/restore.screen';

const OLDER = Date.parse('2026-09-28T09:15:00.000Z');
const NEWER = Date.parse('2026-09-29T11:45:00.000Z');
const LEXICAL = JSON.stringify({
  root: {
    type: 'root',
    version: 1,
    direction: null,
    format: '',
    indent: 0,
    children: [
      {
        type: 'paragraph',
        version: 1,
        direction: null,
        format: '',
        indent: 0,
        children: [{ type: 'extended-text', version: 1, text: 'Words worth keeping' }],
      },
    ],
  },
});

function clearLocalRevisions(): void {
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith(`${LOCAL_REVISION_PREFIX}-`)) {
      localStorage.removeItem(key);
    }
  }
}

function storeCopy(id: string, timestamp: number, fields: Record<string, unknown>): void {
  localStorage.setItem(
    `${LOCAL_REVISION_PREFIX}-${id}-${timestamp}`,
    JSON.stringify({ id, revisionTimestamp: timestamp, ...fields }),
  );
}

function created(request: CapturedEndpointRequest | undefined, resource: 'posts' | 'pages') {
  const body = request?.body as Record<string, Record<string, unknown>[]> | undefined;
  return body?.[resource][0] ?? {};
}

/**
 * The restore screen lists the copies the editor keeps in this browser and turns
 * any of them back into a draft.
 */
describe('Restore posts', () => {
  beforeEach(() => {
    clearLocalRevisions();
    onTestFinished(clearLocalRevisions);
  });

  it('lists every local copy newest first, with its title, excerpt and time', async () => {
    storeCopy('post-1', OLDER, {
      type: 'post',
      title: 'An older draft',
      custom_excerpt: 'What it was about',
    });
    // Copies can carry the post's full serialization, with its excerpt under `excerpt`.
    storeCopy('post-2', NEWER, {
      type: 'post',
      title: 'A newer draft',
      excerpt: 'Written moments ago',
      authors: [{ id: '1', name: 'Jo', email: 'jo@example.com' }],
    });
    storeCopy('post-4', OLDER - 1000, { type: 'post', title: 'No excerpt', lexical: LEXICAL });
    localStorage.setItem(`${LOCAL_REVISION_PREFIX}-post-3-${NEWER}`, 'not a copy');

    await renderAdminApp('/restore');

    await expect.element(restoreScreen.heading()).toBeVisible();
    await expect(restoreScreen.revisionRows()).toHaveCount(3);
    await expect.element(restoreScreen.revisionRows().nth(0)).toHaveTextContent('A newer draft');
    await expect.element(restoreScreen.revisionRows().nth(1)).toHaveTextContent('An older draft');
    await expect
      .element(restoreScreen.revisionRow('A newer draft'))
      .toHaveTextContent('Written moments ago');
    await expect
      .element(restoreScreen.revisionRow('An older draft'))
      .toHaveTextContent('What it was about');
    await expect
      .element(restoreScreen.revisionRow('An older draft'))
      .toHaveTextContent(moment(OLDER).format('MMM D, YYYY HH:mm'));
    await expect
      .element(restoreScreen.revisionRow('No excerpt'))
      .toHaveTextContent('Words worth keeping');
  });

  it('says so when this browser holds no copies', async () => {
    await renderAdminApp('/restore');

    await expect.element(restoreScreen.emptyState()).toBeVisible();
  });

  it.each(['light', 'dark'] as const)(
    'highlights only the hovered revision and keeps the introduction readable in %s mode',
    async (theme) => {
      storeCopy('post-1', OLDER, { title: 'An older draft', custom_excerpt: 'Earlier words' });
      storeCopy('post-2', NEWER, { title: 'A newer draft', custom_excerpt: 'Recent words' });
      await renderAdminApp('/restore');
      await sidebarScreen.selectAppearance(theme);
      await restoreScreen.heading().hover();
      const row = restoreScreen.revisionRow('A newer draft');
      await expect.element(row).toBeVisible();
      const introduction = page.getByText('Posts are regularly saved locally', { exact: false });
      const headers = page.getByRole('columnheader').elements();
      const background = (element: Element) => getComputedStyle(element).backgroundColor;
      const headerBackgrounds = headers.map(background);
      const otherCells = restoreScreen.revisionRow('An older draft').getByRole('cell').elements();
      const otherBackgrounds = otherCells.map(background);
      const cells = row.getByRole('cell').elements();
      const originalBackground = background(cells[0]);

      await row.hover();

      await expect.poll(() => background(cells[0])).not.toBe(originalBackground);
      expect(cells.map(background)).toEqual(cells.map(() => background(cells[0])));
      expect(headers.map(background)).toEqual(headerBackgrounds);
      expect(otherCells.map(background)).toEqual(otherBackgrounds);
      await expect.element(introduction).toBeVisible();
      await expect.element(row.getByText('Recent words')).toBeVisible();
    },
  );

  it('keeps long revision titles and restore actions inside a mobile viewport', async () => {
    await page.viewport(390, 844);
    onTestFinished(() => page.viewport(1280, 800));
    const title = 'A'.repeat(255);
    storeCopy('post-1', NEWER, { title, custom_excerpt: 'Words worth keeping' });
    fakeAdminEndpoint('POST', /^\/posts\/\?/, ({ body }) => ({
      posts: [{ ...(body as { posts: object[] }).posts[0], id: 'restored-mobile' }],
    }));
    await renderAdminApp('/restore');
    const row = restoreScreen.revisionRow(title);
    await expect.element(row).toBeVisible();
    await expect
      .element(
        row
          .getByRole('cell')
          .first()
          .getByText(moment(NEWER).format('MMM D, YYYY HH:mm'), { exact: true }),
      )
      .toBeVisible();
    expect(row.restoreButton().element().getBoundingClientRect().bottom).toBeLessThan(
      window.innerHeight,
    );
    expect(row.element().getBoundingClientRect().right).toBeLessThanOrEqual(window.innerWidth);
    expect(row.restoreButton().element().getBoundingClientRect().right).toBeLessThanOrEqual(
      window.innerWidth,
    );
    await row.restoreButton().click();
    await expect.element(row.openLink()).toBeVisible();
    expect(row.openLink().element().getBoundingClientRect().right).toBeLessThanOrEqual(
      window.innerWidth,
    );
  });

  it('restores a copy as a new draft and links to it', async () => {
    storeCopy('post-1', NEWER, {
      type: 'post',
      status: 'draft',
      title: 'Lost words',
      slug: 'lost-words',
      lexical: LEXICAL,
      authors: [{ id: '1' }],
      tags: [{ id: 'tag-1', name: 'News', slug: 'news' }, { name: 'Typed only' }],
    });
    const createApi = fakeAdminEndpoint('POST', /^\/posts\/\?/, ({ body }) => ({
      posts: [{ ...(body as { posts: object[] }).posts[0], id: 'restored-1' }],
    }));
    await renderAdminApp('/restore');

    await restoreScreen.revisionRow('Lost words').restoreButton().click();

    await expect.element(page.getByText('Post restored')).toBeVisible();
    expect(created(createApi.lastRequest, 'posts')).toEqual({
      title: '(Restored) Lost words',
      slug: 'lost-words',
      lexical: LEXICAL,
      status: 'draft',
      authors: [{ id: '1' }],
      tags: [{ id: 'tag-1', name: 'News', slug: 'news' }, { name: 'Typed only' }],
    });

    await expect.element(restoreScreen.revisionRow('Lost words').openLink()).toHaveFocus();
    await restoreScreen.revisionRow('Lost words').openLink().click();
    await expect.poll(currentRoute).toBe('/editor/post/restored-1');
  });

  it('credits only a Contributor who restores a copy of a post someone else wrote', async () => {
    const me = currentUserResponse();
    me.users[0].roles = [staffRole({ name: 'Contributor' })];
    storeCopy('post-1', NEWER, {
      type: 'post',
      title: 'Shared draft',
      lexical: LEXICAL,
      authors: [{ id: 'editor-1' }, { id: me.users[0].id }],
    });
    const createApi = fakeAdminEndpoint('POST', /^\/posts\/\?/, ({ body }) => ({
      posts: [{ ...(body as { posts: object[] }).posts[0], id: 'restored-2' }],
    }));
    await renderAdminApp('/restore', { boot: { browseMe: { response: me } } });

    await restoreScreen.revisionRow('Shared draft').restoreButton().click();

    await expect.element(restoreScreen.revisionRow('Shared draft').openLink()).toBeVisible();
    expect(created(createApi.lastRequest, 'posts').authors).toEqual([{ id: me.users[0].id }]);
  });

  it('starts one restore however quickly the button is pressed twice', async () => {
    storeCopy('post-1', NEWER, { type: 'post', title: 'Lost words', lexical: LEXICAL });
    const createApi = fakeAdminEndpoint('POST', /^\/posts\/\?/, ({ body }) => ({
      posts: [{ ...(body as { posts: object[] }).posts[0], id: 'restored-3' }],
    }));
    await renderAdminApp('/restore');
    await expect.element(restoreScreen.revisionRow('Lost words').restoreButton()).toBeVisible();
    const button = restoreScreen.revisionRow('Lost words').restoreButton().element() as HTMLElement;

    button.click();
    button.click();

    await expect.element(restoreScreen.revisionRow('Lost words').openLink()).toBeVisible();
    expect(createApi.requests).toHaveLength(1);
  });

  it('restores a page as a page', async () => {
    storeCopy('page-1', NEWER, { type: 'page', title: 'About us', lexical: LEXICAL });
    const createApi = fakeAdminEndpoint('POST', /^\/pages\/\?/, ({ body }) => ({
      pages: [{ ...(body as { pages: object[] }).pages[0], id: 'restored-page' }],
    }));
    await renderAdminApp('/restore');

    await restoreScreen.revisionRow('About us').restoreButton().click();

    await expect.element(page.getByText('Page restored')).toBeVisible();
    expect(created(createApi.lastRequest, 'pages')).toMatchObject({
      title: '(Restored) About us',
      slug: 'untitled',
      status: 'draft',
    });
    await expect
      .element(restoreScreen.revisionRow('About us').openLink())
      .toHaveAccessibleName('Open restored page');
    await expect
      .element(restoreScreen.revisionRow('About us').openLink())
      .toHaveAttribute('href', expect.stringContaining('/editor/page/restored-page'));
  });

  it('keeps the copy restorable when the server refuses the draft', async () => {
    storeCopy('post-1', NEWER, { type: 'post', title: 'Lost words', lexical: LEXICAL });
    fakeAdminEndpoint(
      'POST',
      /^\/posts\/\?/,
      {
        errors: [
          {
            message: 'Validation error, cannot save post.',
            context: 'Value in [posts.title] exceeds maximum length of 255 characters.',
            type: 'ValidationError',
          },
        ],
      },
      { status: 422 },
    );
    await renderAdminApp('/restore');

    await restoreScreen.revisionRow('Lost words').restoreButton().click();

    await expect
      .element(page.getByText('Value in [posts.title] exceeds maximum length of 255 characters.'))
      .toBeVisible();
    await expect.element(restoreScreen.revisionRow('Lost words').restoreButton()).toBeEnabled();
    await expect.element(restoreScreen.revisionRow('Lost words').restoreButton()).toHaveFocus();
    expect(localStorage.getItem(`${LOCAL_REVISION_PREFIX}-post-1-${NEWER}`)).not.toBeNull();
  });
});
