import { beforeEach, describe, expect, it, onTestFinished } from 'vitest';
import { userEvent } from 'vitest/browser';
import { buildLexical } from '@tryghost/test-data';
import {
  fakeAdminEndpoint,
  fakeEditorChrome,
  fakeEditorPost,
  renderAdminApp,
  unsavedChangesGuarded,
  withoutAutosave,
  type Post,
} from '@test-utils/acceptance';
import { editorScreen } from '@/editor/editor.screen';
import { OLD_SCHEMA_CORPUS } from '@/editor/engine/__fixtures__';
import { LOCAL_REVISION_PREFIX, readLocalRevisions } from '@/editor/local-revisions';

const POST_ID = 'abc123';
// No debounced save reaches the server, so what the writer typed stays unsaved.

function clearLocalRevisions(): void {
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith(`${LOCAL_REVISION_PREFIX}-`)) {
      localStorage.removeItem(key);
    }
  }
}

function localCopies() {
  return readLocalRevisions(localStorage);
}

function fakeSavablePost(overrides: Partial<Post> = {}) {
  fakeEditorChrome();
  fakeAdminEndpoint('GET', /^\/slugs\/post\//, ({ url }) => ({
    slugs: [{ slug: decodeURIComponent(url.split('/slugs/post/')[1].split('/')[0]) }],
  }));
  return fakeEditorPost({ tags: [], ...overrides });
}

async function appendToBody(text: string): Promise<void> {
  const body = editorScreen.body();
  await body.fill(`${body.element().textContent ?? ''}${text}`);
}

function hidePage(): void {
  window.dispatchEvent(new Event('pagehide'));
}

function hideTab(): void {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
  try {
    document.dispatchEvent(new Event('visibilitychange'));
  } finally {
    delete (document as { visibilityState?: unknown }).visibilityState;
  }
}

/**
 * Local copies of a draft the writer is working on, kept in the browser so the
 * restore screen can bring back work that never reached the server.
 */
describe('Post editor local revisions', () => {
  beforeEach(() => {
    clearLocalRevisions();
    onTestFinished(clearLocalRevisions);
  });

  it('keeps a copy of a draft as soon as the writer changes it', async () => {
    fakeSavablePost();
    await renderAdminApp(`/editor/post/${POST_ID}`, withoutAutosave());
    await expect.element(editorScreen.body()).toHaveTextContent('Hello from React');

    await appendToBody(' and a local copy');

    await expect.poll(() => localCopies().length).toBe(1);
    const [copy] = localCopies();
    expect(copy.key).toMatch(new RegExp(`^post-revision-${POST_ID}-\\d+$`));
    expect(copy).toMatchObject({
      id: POST_ID,
      type: 'post',
      status: 'draft',
      title: 'Hello from React',
      slug: 'hello-from-react',
    });
    expect(copy.lexical).toContain('Hello from React and a local copy');
  });

  it('writes the latest draft when the page goes away inside the minute', async () => {
    fakeSavablePost();
    await renderAdminApp(`/editor/post/${POST_ID}`, withoutAutosave());
    await expect.element(editorScreen.body()).toHaveTextContent('Hello from React');
    await appendToBody(' first');
    await expect.poll(() => localCopies().length).toBe(1);

    await appendToBody(' second');
    hidePage();

    await expect.poll(() => localCopies().length).toBe(2);
    expect(localCopies()[0].lexical).toContain('Hello from React first second');
  });

  it('writes the latest draft when the tab is hidden inside the minute', async () => {
    fakeSavablePost();
    await renderAdminApp(`/editor/post/${POST_ID}`, withoutAutosave());
    await expect.element(editorScreen.body()).toHaveTextContent('Hello from React');
    await appendToBody(' first');
    await expect.poll(() => localCopies().length).toBe(1);

    await appendToBody(' second');
    hideTab();

    await expect.poll(() => localCopies().length).toBe(2);
    expect(localCopies()[0].lexical).toContain('Hello from React first second');
  });

  it.each([
    [
      'old-schema nodes',
      JSON.stringify(OLD_SCHEMA_CORPUS.find(({ name }) => name === 'legacy-text-nodes')?.before),
      'bold',
      'bold',
    ],
    [
      'a card that rewrites itself',
      buildLexical({ header: { accentColor: '#123456' } }),
      'Header card',
      'Before header',
    ],
  ])(
    'keeps no copy of a draft that was only opened, with %s',
    async (_name, lexical, shown, typedAt) => {
      fakeSavablePost({ lexical });
      await renderAdminApp(`/editor/post/${POST_ID}`, withoutAutosave());
      await expect.element(editorScreen.body().getByText(shown)).toBeVisible();
      await expect.element(editorScreen.secondaryInstance().getByText(shown)).toBeInTheDocument();
      await expect.poll(unsavedChangesGuarded).toBe(false);

      hidePage();
      expect(localCopies()).toEqual([]);

      await editorScreen.body().getByText(typedAt).click();
      await userEvent.keyboard(' edited');
      await expect.poll(() => localCopies().length).toBe(1);
    },
  );

  it('keeps no copy of a published post', async () => {
    fakeSavablePost({ status: 'published', published_at: '2026-01-01T00:00:00.000Z' });
    await renderAdminApp(`/editor/post/${POST_ID}`, withoutAutosave());
    await expect.element(editorScreen.body()).toHaveTextContent('Hello from React');

    await appendToBody(' and an unsaved update');
    await expect.poll(unsavedChangesGuarded).toBe(true);
    hidePage();

    expect(localCopies()).toEqual([]);
  });
});
