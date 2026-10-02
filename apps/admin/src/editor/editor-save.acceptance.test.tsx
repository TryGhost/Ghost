import { toast } from 'sonner';
import { describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { buildLexicalParagraph } from '@tryghost/test-data';

import {
  currentRoute,
  currentUserResponse,
  editorReadLanded,
  fakeAdminEndpoint,
  fakeEditorChrome,
  fakeEditorPost,
  post,
  renderAdminApp,
  staffRole,
  submittedPost,
  tag,
  withFastAutosave,
  withoutAutosave,
  unsavedChangesGuarded,
  type CapturedEndpointRequest,
  type EndpointCapture,
  type RenderAdminAppOptions,
} from '@test-utils/acceptance';
import { editorBody } from '@tryghost/test-data/selectors/editor';
import { editorScreen } from '@/editor/editor.screen';
import { OLD_SCHEMA_CORPUS } from '@/editor/engine/__fixtures__';
import {
  EXCERPT_MAX,
  EXCERPT_TOO_LONG,
  TITLE_MAX,
  TITLE_TOO_LONG,
} from '@/editor/session/settings-fields';
import { deferred } from '@/utils/deferred';

const POST_ID = 'abc123';
const NEW_POST_ID = 'new789';
const CURRENT_USER_ID = '1';
const FLAG_ON = withFastAutosave({ labs: { editorReact: true } });
const LOADED_AT = '2026-01-01T00:00:00.000Z';
const CREATED_AT = '2026-01-01T00:00:05.000Z';

type SavedPost = ReturnType<typeof post>;

function postIn(request: CapturedEndpointRequest | undefined): Record<string, unknown> {
  const body = request?.body as { posts: Record<string, unknown>[] } | undefined;
  return body?.posts[0] ?? {};
}

function submittedBody(capture: EndpointCapture): string {
  const lexical = submittedPost(capture).lexical;
  return typeof lexical === 'string' ? lexical : '';
}

/**
 * A post that answers saves the way Ghost does: the response carries the
 * submitted fields back with a fresh collision token, and the read endpoint
 * serves whatever was saved last.
 */
function fakeSavablePost(overrides: Partial<SavedPost> = {}) {
  fakeEditorChrome();
  fakeAdminEndpoint('GET', /^\/slugs\/post\//, ({ url }) => ({
    slugs: [{ slug: decodeURIComponent(url.split('/slugs/post/')[1].split('/')[0]) }],
  }));
  return fakeEditorPost({
    tags: [],
    ...overrides,
  });
}

/** A post that does not exist yet, with the create and the follow-up writes answered. */
function fakeCreatablePost() {
  fakeEditorChrome();
  fakeAdminEndpoint('GET', /^\/slugs\/post\/untitled\//, { slugs: [{ slug: 'untitled' }] });
  let created = post({
    id: NEW_POST_ID,
    title: '(Untitled)',
    slug: 'untitled',
    status: 'draft',
    updated_at: CREATED_AT,
    published_at: null,
    tags: [],
  });
  const createApi = fakeAdminEndpoint('POST', /^\/posts\/\?/, ({ body }) => {
    const submitted = (body as { posts: Partial<SavedPost>[] }).posts[0];
    created = { ...created, ...submitted, id: NEW_POST_ID, updated_at: CREATED_AT };
    return { posts: [created] };
  });
  fakeAdminEndpoint('GET', new RegExp(`^/posts/${NEW_POST_ID}/\\?`), () => ({ posts: [created] }));
  fakeAdminEndpoint('PUT', new RegExp(`^/posts/${NEW_POST_ID}/\\?`), () => ({ posts: [created] }));

  return createApi;
}

function bootAs(role: 'Author' | 'Contributor'): RenderAdminAppOptions {
  const me = currentUserResponse();
  me.users[0].roles = [staffRole({ name: role })];
  return { ...FLAG_ON, boot: { browseMe: { response: me } } };
}

async function appendToBody(text: string) {
  const body = editorScreen.body();
  // One input event: a fast autosave must not split a keyboard sequence into several saves.
  await body.fill(`${body.element().textContent ?? ''}${text}`);
}

function bodyElement(): Element | null {
  return document.querySelector(`[data-testid="${editorBody}"]`);
}

const POST_NOT_FOUND = { errors: [{ type: 'NotFoundError', message: 'Post not found.' }] };
// A limit the editor does not hold the writer to before saving.
const CAPTION_REFUSED = 'Validation failed for feature_image_caption.';
// Ghost answers a request whose session has gone with this 403.
const SESSION_GONE = { errors: [{ type: 'NoPermissionError', message: 'Authorization failed' }] };

/** A later handler for the same route wins, so from here every read of the post fails. */
function failReads(status: number, body: object): EndpointCapture {
  return fakeAdminEndpoint('GET', new RegExp(`^/posts/${POST_ID}/\\?`), body, { status });
}

/**
 * The React post editor's save engine wired to the API: body edits autosave,
 * a new post is created on its first edit, and a rejected save surfaces in
 * place instead of losing what was typed.
 */
describe('Post editor saving', () => {
  it('autosaves the body and sends the write contract', async () => {
    const saveApi = fakeSavablePost();
    await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);

    await expect.element(editorScreen.body()).toHaveTextContent('Hello from React');
    await appendToBody(' and more');

    await expect.poll(() => saveApi.requests.length).toBe(1);
    const url = saveApi.lastRequest?.url ?? '';
    expect(url).toContain('formats=mobiledoc%2Clexical');
    expect(url).toContain('include=tags%2Cauthors');
    // A background save never asks the server for a revision.
    expect(url).not.toContain('save_revision');

    expect(submittedPost(saveApi)).toMatchObject({
      id: POST_ID,
      title: 'Hello from React',
      slug: 'hello-from-react',
      status: 'draft',
      updated_at: LOADED_AT,
    });
    expect(submittedBody(saveApi)).toContain('Hello from React and more');
  });

  it('stays clean once the save has been acknowledged and refetched', async () => {
    const saveApi = fakeSavablePost();
    await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);

    await expect.element(editorScreen.body()).toHaveTextContent('Hello from React');
    await appendToBody(' and more');

    await expect.poll(() => saveApi.requests.length).toBe(1);
    await expect.poll(unsavedChangesGuarded).toBe(false);
    await editorScreen.titleInput().click();
    await editorScreen.body().click();

    await expect.poll(() => saveApi.requests.length).toBe(1);
  });

  it('leaves an old-schema post alone until it is edited', async () => {
    const legacy = OLD_SCHEMA_CORPUS.find(({ name }) => name === 'legacy-text-nodes');
    const saveApi = fakeSavablePost({ lexical: JSON.stringify(legacy?.before) });
    await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);

    await expect.element(editorScreen.body()).toBeVisible();
    await expect.poll(() => saveApi.requests.length).toBe(0);

    await appendToBody(' edited');

    await expect.poll(() => saveApi.requests.length).toBe(1);
  });

  it('creates a new post on the first edit and swaps the URL without remounting', async () => {
    fakeEditorChrome();
    fakeAdminEndpoint('GET', /^\/slugs\/post\/untitled\//, { slugs: [{ slug: 'untitled' }] });
    let created = post({
      id: NEW_POST_ID,
      title: '(Untitled)',
      slug: 'untitled',
      status: 'draft',
      updated_at: CREATED_AT,
      published_at: null,
      tags: [],
    });
    const createApi = fakeAdminEndpoint('POST', /^\/posts\/\?/, ({ body }) => {
      const submitted = (body as { posts: Partial<SavedPost>[] }).posts[0];
      created = { ...created, ...submitted, id: NEW_POST_ID, updated_at: CREATED_AT };
      return { posts: [created] };
    });
    fakeAdminEndpoint('GET', new RegExp(`^/posts/${NEW_POST_ID}/\\?`), () => ({
      posts: [created],
    }));
    fakeAdminEndpoint('PUT', new RegExp(`^/posts/${NEW_POST_ID}/\\?`), () => ({
      posts: [created],
    }));

    await renderAdminApp('/editor/post', FLAG_ON);
    await expect.element(editorScreen.body()).toBeVisible();
    const mountedBody = bodyElement();

    await appendToBody('First words');

    await expect.poll(() => createApi.requests.length).toBe(1);
    expect(submittedPost(createApi)).toMatchObject({ title: '(Untitled)', slug: 'untitled' });
    expect(submittedPost(createApi).id).toBeUndefined();

    await expect.poll(currentRoute).toBe(`/editor/post/${NEW_POST_ID}`);
    expect(bodyElement()).toBe(mountedBody);
    await expect.element(editorScreen.body()).toHaveTextContent('First words');
  });

  // Core refuses an Author's or Contributor's create unless the payload names
  // them as the author, so these roles could not start a post without it.
  it.each(['Contributor', 'Author'] as const)(
    'names the writer as the author when the %s role creates a post',
    async (role) => {
      const createApi = fakeCreatablePost();

      await renderAdminApp('/editor/post', bootAs(role));
      await expect.element(editorScreen.body()).toBeVisible();

      await appendToBody('First words');

      await expect.poll(() => createApi.requests.length).toBe(1);
      expect(submittedPost(createApi).authors).toEqual([{ id: CURRENT_USER_ID }]);
    },
  );

  it('keeps typing that lands while the create is in flight and updates the new post', async () => {
    fakeEditorChrome();
    fakeAdminEndpoint('GET', /^\/slugs\/post\/untitled\//, { slugs: [{ slug: 'untitled' }] });
    let created = post({
      id: NEW_POST_ID,
      title: '(Untitled)',
      slug: 'untitled',
      status: 'draft',
      updated_at: CREATED_AT,
      published_at: null,
      tags: [],
    });
    const createResponse = deferred<{ posts: SavedPost[] }>();
    const createApi = fakeAdminEndpoint('POST', /^\/posts\/\?/, ({ body }) => {
      const submitted = (body as { posts: Partial<SavedPost>[] }).posts[0];
      created = { ...created, ...submitted, id: NEW_POST_ID, updated_at: CREATED_AT };
      return createResponse.promise;
    });
    fakeAdminEndpoint('GET', new RegExp(`^/posts/${NEW_POST_ID}/\\?`), () => ({
      posts: [created],
    }));
    const updateApi = fakeAdminEndpoint(
      'PUT',
      new RegExp(`^/posts/${NEW_POST_ID}/\\?`),
      ({ body }) => {
        const submitted = (body as { posts: Partial<SavedPost>[] }).posts[0];
        created = { ...created, ...submitted, updated_at: '2026-01-01T00:00:09.000Z' };
        return { posts: [created] };
      },
    );

    await renderAdminApp('/editor/post', FLAG_ON);
    await expect.element(editorScreen.body()).toBeVisible();

    await appendToBody('First words');
    await expect.poll(() => createApi.requests.length).toBe(1);

    try {
      await appendToBody(' and then some');
      expect(submittedBody(createApi)).not.toContain('and then some');
    } finally {
      createResponse.resolve({ posts: [created] });
    }

    // The edit made while the create was held reaches the follow-up update.
    await expect.poll(() => submittedBody(updateApi)).toContain('First words and then some');
    // The first update carries the id and the token the create handed back.
    expect(postIn(updateApi.requests[0])).toMatchObject({
      id: NEW_POST_ID,
      updated_at: CREATED_AT,
    });
    await expect.element(editorScreen.body()).toHaveTextContent('First words and then some');
  });

  it('saves on Cmd-S and asks the server for a revision', async () => {
    const saveApi = fakeSavablePost();
    await renderAdminApp(`/editor/post/${POST_ID}`, withoutAutosave(FLAG_ON));

    await expect.element(editorScreen.body()).toHaveTextContent('Hello from React');
    await appendToBody(' and more');
    await userEvent.keyboard('{Meta>}s{/Meta}');

    await expect.poll(() => saveApi.requests.length).toBe(1);
    expect(saveApi.lastRequest?.url ?? '').toContain('save_revision=true');
    expect(submittedPost(saveApi)).toMatchObject({
      id: POST_ID,
      title: 'Hello from React',
      slug: 'hello-from-react',
      status: 'draft',
      updated_at: LOADED_AT,
    });
    expect(String(submittedPost(saveApi).lexical)).toContain('Hello from React and more');
    await expect.element(editorScreen.saveToast('Post saved')).toBeVisible();
  });

  it('replaces the last save toast with the next one on a second Cmd-S', async () => {
    const saveApi = fakeSavablePost();
    await renderAdminApp(`/editor/post/${POST_ID}`, withoutAutosave(FLAG_ON));

    await expect.element(editorScreen.body()).toHaveTextContent('Hello from React');
    await appendToBody(' and more');
    await userEvent.keyboard('{Meta>}s{/Meta}');
    await expect.element(editorScreen.saveToast('Post saved')).toBeVisible();

    await appendToBody(' and again');
    await userEvent.keyboard('{Meta>}s{/Meta}');
    await expect.poll(() => saveApi.requests.length).toBe(2);

    // Outlasts the dismissed toast's exit animation.
    await new Promise((resolve) => {
      setTimeout(resolve, 500);
    });
    await expect(editorScreen.saveToast('Post saved')).toHaveCount(1);
  });

  it('lands a renamed draft clean, with the slug the server generated', async () => {
    const saveApi = fakeSavablePost();
    await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);

    await expect.element(editorScreen.body()).toHaveTextContent('Hello from React');
    await editorScreen.titleInput().fill('Brand New Name');
    await editorScreen.body().click();

    await expect.poll(() => saveApi.requests.length).toBe(1);
    expect(submittedPost(saveApi)).toMatchObject({
      title: 'Brand New Name',
      slug: 'brand-new-name',
    });

    // Nothing is left diverged, so no further save is attempted.
    await editorScreen.titleInput().click();
    await editorScreen.body().click();
    await expect.poll(() => saveApi.requests.length).toBe(1);
  });

  it('reports the save in the header and settles on saved', async () => {
    fakeSavablePost();
    await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);

    await expect.element(editorScreen.status()).toHaveTextContent('Draft - Saved');
    await appendToBody(' and more');

    await expect.element(editorScreen.status()).toHaveTextContent('Saving');
    await expect.element(editorScreen.status()).toHaveTextContent('Draft - Saved');
    // Toasts render in order, so one raised after the save would follow its toast onto the screen.
    toast('Later toast');
    await expect.element(editorScreen.saveToast('Later toast')).toBeVisible();
    await expect(editorScreen.saveToast('Post saved')).toHaveCount(0);
  });

  it('saves its own version when a refetch finds the post published elsewhere, and collides', async () => {
    const saveApi = fakeSavablePost();
    const { queryClient } = await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);

    await expect.element(editorScreen.body()).toHaveTextContent('Hello from React');
    await expect.element(editorScreen.status()).toHaveTextContent('Draft - Saved');

    // A later handler for the same route wins: from here the read answers
    // with the post as someone else has just published it.
    const publishedElsewhere = post({
      id: POST_ID,
      title: 'Hello from React',
      slug: 'hello-from-react',
      status: 'published',
      lexical: buildLexicalParagraph('Hello from React'),
      updated_at: '2026-01-01T00:01:00.000Z',
      published_at: '2026-01-01T00:01:00.000Z',
      tags: [],
    });
    fakeAdminEndpoint('GET', new RegExp(`^/posts/${POST_ID}/\\?`), { posts: [publishedElsewhere] });
    await appendToBody(' and more');
    await expect.poll(() => saveApi.requests.length).toBe(1);
    await editorReadLanded(queryClient, publishedElsewhere);

    // The server holds their version now, so a save on any other token collides.
    const collidingSaveApi = fakeAdminEndpoint(
      'PUT',
      new RegExp(`^/posts/${POST_ID}/\\?`),
      ({ body }) =>
        (body as { posts: Array<{ updated_at?: string }> }).posts[0].updated_at ===
        publishedElsewhere.updated_at
          ? { posts: [publishedElsewhere] }
          : Response.json(
              {
                errors: [
                  {
                    code: 'UPDATE_COLLISION',
                    type: 'UpdateCollisionError',
                    message: 'Saving failed! Someone else is editing this post.',
                  },
                ],
              },
              { status: 409 },
            ),
    );
    await appendToBody(' again');

    await expect.poll(() => collidingSaveApi.requests.length).toBe(1);
    expect(submittedPost(collidingSaveApi)).toMatchObject({
      status: 'draft',
      updated_at: '2026-01-01T00:00:01.000Z',
    });
    await expect
      .element(editorScreen.conflictBanner())
      .toHaveTextContent('Someone else is editing this post');
    await expect.element(editorScreen.body()).toHaveTextContent('Hello from React and more again');
  });

  it('keeps the editor and what was typed when the read after a save fails with a 500', async () => {
    const saveApi = fakeSavablePost();
    await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
    await expect.element(editorScreen.body()).toHaveTextContent('Hello from React');
    const mountedBody = bodyElement();

    const failedRead = failReads(500, {
      errors: [{ type: 'InternalServerError', message: 'Boom' }],
    });
    await appendToBody(' and more');
    await expect.poll(() => saveApi.requests.length).toBe(1);
    await expect.poll(() => failedRead.requests.length).toBeGreaterThan(0);

    await appendToBody(' and then some');

    await expect.poll(() => saveApi.requests.length).toBe(2);
    expect(submittedBody(saveApi)).toContain('Hello from React and more and then some');
    await expect
      .element(editorScreen.body())
      .toHaveTextContent('Hello from React and more and then some');
    await expect(editorScreen.loadError()).toHaveCount(0);
    expect(bodyElement()).toBe(mountedBody);
  });

  it('leaves an expired session to the next save when the read after a save is a 403', async () => {
    const saveApi = fakeSavablePost();
    await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
    await expect.element(editorScreen.body()).toHaveTextContent('Hello from React');
    const mountedBody = bodyElement();

    const expiredRead = failReads(403, SESSION_GONE);
    await appendToBody(' and more');
    await expect.poll(() => saveApi.requests.length).toBe(1);
    await expect.poll(() => expiredRead.requests.length).toBeGreaterThan(0);

    const expiredSave = fakeAdminEndpoint(
      'PUT',
      new RegExp(`^/posts/${POST_ID}/\\?`),
      SESSION_GONE,
      { status: 403 },
    );
    await appendToBody(' and then some');

    await expect.poll(() => expiredSave.requests.length).toBe(1);
    await expect.element(editorScreen.reauthDialog()).toBeVisible();
    await expect
      .element(editorScreen.bodyBehindDialog())
      .toHaveTextContent('Hello from React and more and then some');
    await expect(editorScreen.loadError()).toHaveCount(0);
    expect(bodyElement()).toBe(mountedBody);
  });

  it('leaves a post deleted elsewhere to the next save when the read after a save is a 404', async () => {
    const saveApi = fakeSavablePost();
    await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
    await expect.element(editorScreen.body()).toHaveTextContent('Hello from React');
    const mountedBody = bodyElement();

    const goneRead = failReads(404, POST_NOT_FOUND);
    await appendToBody(' and more');
    await expect.poll(() => saveApi.requests.length).toBe(1);
    await expect.poll(() => goneRead.requests.length).toBeGreaterThan(0);

    const goneSave = fakeAdminEndpoint(
      'PUT',
      new RegExp(`^/posts/${POST_ID}/\\?`),
      POST_NOT_FOUND,
      { status: 404 },
    );
    await appendToBody(' and then some');

    await expect.poll(() => goneSave.requests.length).toBe(1);
    await expect
      .element(editorScreen.conflictBanner())
      .toHaveTextContent('This post has been deleted');
    await expect
      .element(editorScreen.body())
      .toHaveTextContent('Hello from React and more and then some');
    await expect(editorScreen.notFound()).toHaveCount(0);
    expect(bodyElement()).toBe(mountedBody);
  });

  it('holds a title past the limit where it is typed, and refuses it on Cmd-S', async () => {
    const saveApi = fakeSavablePost();
    await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
    await expect.element(editorScreen.body()).toHaveTextContent('Hello from React');

    await editorScreen.titleInput().fill('a'.repeat(TITLE_MAX + 1));
    await editorScreen.body().click();

    await expect.element(editorScreen.titleInput()).toHaveAttribute('aria-invalid', 'true');
    await expect.element(editorScreen.titleInput()).toHaveAccessibleDescription(TITLE_TOO_LONG);
    await expect.element(editorScreen.pendingSaveNotice()).toHaveTextContent(TITLE_TOO_LONG);
    await expect(editorScreen.saveErrorBanner()).toHaveCount(0);

    await userEvent.keyboard('{Meta>}s{/Meta}');

    await expect.element(editorScreen.saveErrorBanner()).toHaveTextContent(TITLE_TOO_LONG);
    expect(saveApi.requests).toHaveLength(0);

    await editorScreen.titleInput().fill('A title the server keeps');
    await editorScreen.body().click();

    await expect(saveApi).toHaveSavedFields({ title: 'A title the server keeps' });
    await expect.element(editorScreen.titleInput()).toHaveAttribute('aria-invalid', 'false');
  });

  it.each([
    {
      home: 'under the title',
      options: withFastAutosave({ labs: { editorReact: true, editorExcerpt: true } }),
      open: async () => {},
      excerpt: () => editorScreen.excerptInput(),
    },
    {
      home: 'in the settings panel',
      options: FLAG_ON,
      open: () => editorScreen.settingsToggle().click(),
      excerpt: () => editorScreen.settingsExcerpt(),
    },
  ])(
    'holds an excerpt past the limit $home, and refuses it on Cmd-S',
    async ({ options, open, excerpt }) => {
      const saveApi = fakeSavablePost({ custom_excerpt: null });
      await renderAdminApp(`/editor/post/${POST_ID}`, options);
      await expect.element(editorScreen.body()).toHaveTextContent('Hello from React');
      await open();

      await excerpt().fill('a'.repeat(EXCERPT_MAX + 1));
      await editorScreen.body().click();

      await expect.element(excerpt()).toHaveAttribute('aria-invalid', 'true');
      await expect.element(excerpt()).toHaveAccessibleDescription(EXCERPT_TOO_LONG);
      await expect.element(editorScreen.pendingSaveNotice()).toHaveTextContent(EXCERPT_TOO_LONG);
      await expect(editorScreen.saveErrorBanner()).toHaveCount(0);

      await userEvent.keyboard('{Meta>}s{/Meta}');

      await expect.element(editorScreen.saveErrorBanner()).toHaveTextContent(EXCERPT_TOO_LONG);
      expect(saveApi.requests).toHaveLength(0);

      await excerpt().fill('An excerpt the server keeps');
      await editorScreen.body().click();

      await expect(saveApi).toHaveSavedFields({ custom_excerpt: 'An excerpt the server keeps' });
    },
  );

  it('shows the reason the server gave for refusing a save', async () => {
    fakeSavablePost();
    const refusedSave = fakeAdminEndpoint(
      'PUT',
      new RegExp(`^/posts/${POST_ID}/\\?`),
      {
        errors: [
          {
            type: 'ValidationError',
            message: 'Validation error, cannot edit post.',
            context: CAPTION_REFUSED,
            property: 'feature_image_caption',
          },
        ],
      },
      { status: 422 },
    );
    await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
    await expect.element(editorScreen.body()).toHaveTextContent('Hello from React');

    await appendToBody(' and more');

    await expect.element(editorScreen.saveErrorBanner()).toHaveTextContent(CAPTION_REFUSED);
    await expect
      .element(editorScreen.saveErrorBanner())
      .not.toHaveTextContent('Validation error, cannot edit post.');
    expect(refusedSave.requests).toHaveLength(1);
  });

  it('leaves tags alone when it saves', async () => {
    const saveApi = fakeSavablePost({ tags: [tag({ id: 'tag1', name: 'News', slug: 'news' })] });
    await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);

    await expect.element(editorScreen.body()).toHaveTextContent('Hello from React');
    await appendToBody(' and more');

    await expect.poll(() => saveApi.requests.length).toBe(1);
    expect(submittedPost(saveApi)).not.toHaveProperty('tags');
  });

  it('halts on a collision and keeps the content', async () => {
    fakeEditorChrome();
    fakeAdminEndpoint('GET', new RegExp(`^/posts/${POST_ID}/\\?`), {
      posts: [
        post({
          id: POST_ID,
          title: 'Hello from React',
          slug: 'hello-from-react',
          status: 'draft',
          lexical: buildLexicalParagraph('Hello from React'),
          updated_at: LOADED_AT,
          tags: [],
        }),
      ],
    });
    const saveApi = fakeAdminEndpoint(
      'PUT',
      new RegExp(`^/posts/${POST_ID}/\\?`),
      {
        errors: [
          {
            code: 'UPDATE_COLLISION',
            type: 'UpdateCollisionError',
            message: 'Saving failed! Someone else is editing this post.',
          },
        ],
      },
      { status: 409 },
    );
    await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);

    await expect.element(editorScreen.body()).toHaveTextContent('Hello from React');
    await appendToBody(' and more');

    await expect
      .element(editorScreen.conflictBanner())
      .toHaveTextContent('Someone else is editing this post');
    await expect.element(editorScreen.body()).toHaveTextContent('Hello from React and more');

    await appendToBody(' again');

    await expect.poll(() => saveApi.requests.length).toBe(1);
    await expect.element(editorScreen.body()).toHaveTextContent('and more again');
  });
});
