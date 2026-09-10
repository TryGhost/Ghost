import { afterEach, describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { buildLexicalParagraph } from '@tryghost/test-data';

import {
  browseResponse,
  currentUserResponse,
  fakeAdminEndpoint,
  fakeNewsletters,
  fakePosts,
  fakeSnippets,
  fakeTiers,
  newsletter,
  post,
  renderAdminApp,
  settingsResponse,
  staffRole,
  submittedPost,
  type StaffRoleName,
} from '@test-utils/acceptance';
import { editorScreen } from '@/editor/editor.screen';
import type { EmberDataChangeEvent } from '@/ember-bridge';
import { deferred } from '@/utils/deferred';
import { previewScreen } from '@/editor/preview/preview.screen';
import { publishScreen } from '@/editor/publish/publish.screen';

const POST_ID = 'abc123';
const POST_UUID = 'post-uuid';
const FLAG_ON = { labs: { editorReact: true } };
const LOADED_AT = '2026-01-01T00:00:00.000Z';
const SITE_URL = 'http://test.com';

// Publishing waits on the email confirmation poll, so these journeys outlast the default timeout.
const SLOW = 25_000;
const SAVE_POLL = { timeout: 10_000 };
const CURRENT_USER_ID = String(currentUserResponse().users[0].id);

/** A site whose bulk email provider is configured, so the flow offers a send. */
const MAILGUN_ON = {
  ...FLAG_ON,
  boot: {
    browseSettings: {
      response: settingsResponse({
        settings: {
          mailgun_domain: 'mail.test.com',
          mailgun_api_key: 'key',
          mailgun_base_url: 'https://api.mailgun.net/v3',
        },
      }),
    },
  },
};

type SavedPost = ReturnType<typeof post>;

/** The error body Ghost answers a failed save with, by status. */
function failureBody(status: number) {
  if (status === 409) {
    return {
      errors: [
        {
          code: 'UPDATE_COLLISION',
          type: 'UpdateCollisionError',
          message: 'Saving failed! Someone else is editing this post.',
        },
      ],
    };
  }

  if (status === 401) {
    return { errors: [{ type: 'UnauthorizedError', message: 'Authorization failed' }] };
  }

  return { errors: [{ type: 'ValidationError', message: 'Title cannot be that long.' }] };
}

/** Every read the header's publish inputs and preview make beyond the boot table. */
function publishChrome({ newsletters = 0 } = {}) {
  fakeSnippets([]);
  fakePosts([]);
  fakeTiers([]);
  fakeNewsletters(
    Array.from({ length: newsletters }, () =>
      newsletter({ slug: 'weekly', name: 'Weekly', status: 'active' }),
    ),
  );
  // The site-wide member total the publish machine reads; the boot entry counts a different shape.
  fakeAdminEndpoint('GET', /^\/members\/\?.*order=id/, {
    members: [],
    meta: { pagination: { page: 1, limit: 1, pages: 1, total: 20, next: null, prev: null } },
  });
}

/**
 * A post that answers saves the way Ghost does: the response carries the
 * submitted fields back with a fresh collision token, and the read endpoint
 * serves whatever was saved last.
 */
function fakeSavablePost(
  overrides: Partial<SavedPost> = {},
  { failWith = 0, holdFirstSave }: { failWith?: number; holdFirstSave?: Promise<void> } = {},
) {
  let current = post({
    id: POST_ID,
    uuid: POST_UUID,
    title: 'Hello from React',
    slug: 'hello-from-react',
    status: 'draft',
    url: `${SITE_URL}/hello-from-react/`,
    lexical: buildLexicalParagraph('Hello from React'),
    updated_at: LOADED_AT,
    published_at: null,
    tags: [],
    authors: [{ id: CURRENT_USER_ID }],
    ...overrides,
  }) as SavedPost & Record<string, unknown>;
  let saves = 0;

  fakeAdminEndpoint('GET', /^\/slugs\/post\//, ({ url }) => ({
    slugs: [{ slug: decodeURIComponent(url.split('/slugs/post/')[1].split('/')[0]) }],
  }));

  fakeAdminEndpoint('GET', new RegExp(`^/posts/${POST_ID}/\\?`), () => ({ posts: [current] }));

  const saveApi = fakeAdminEndpoint(
    'PUT',
    new RegExp(`^/posts/${POST_ID}/\\?`),
    async ({ body, url }) => {
      saves += 1;

      if (holdFirstSave && saves === 1) {
        await holdFirstSave;
      }

      if (failWith) {
        return failureBody(failWith);
      }

      const submitted = (body as { posts: Partial<SavedPost>[] }).posts[0];
      current = { ...current, ...submitted, updated_at: `2026-01-01T00:00:0${saves}.000Z` };

      // A send hands the email over asynchronously; the flow polls until it settles.
      if (url.includes('newsletter=')) {
        current.email = { id: 'email-1', status: 'submitted', email_count: 20, opened_count: 0 };
      }

      return { posts: [current] };
    },
    { status: failWith || 200 },
  );

  return saveApi;
}

/**
 * The Ember half of the state bridge, which the app reads to invalidate the
 * React Query cache when Ember saves a model (src/ember-bridge/ember-bridge.tsx).
 * Returns a function that reports one such save.
 */
function installEmberBridge(): (modelName: string) => void {
  const handlers = new Set<(event: EmberDataChangeEvent) => void>();
  const state = {
    on: (event: string, callback: (event: EmberDataChangeEvent) => void) => {
      if (event === 'emberDataChange') {
        handlers.add(callback);
      }
    },
    off: (_event: string, callback: (event: EmberDataChangeEvent) => void) => {
      handlers.delete(callback);
    },
    sidebarVisible: true,
    getRouteUrl: (routeName: string) => routeName,
    isRouteActive: () => false,
  };
  window.EmberBridge = { state } as unknown as typeof window.EmberBridge;

  return (modelName: string) => {
    handlers.forEach((handler) => handler({ operation: 'update', modelName, id: '1', data: null }));
  };
}

/** The current user with one role, for the role matrix the header renders. */
function asRole(name: StaffRoleName) {
  const me = currentUserResponse();
  me.users[0].roles = [staffRole({ name })];
  return { ...FLAG_ON, boot: { browseMe: { response: me } } };
}

async function typeIntoBody(text: string) {
  await editorScreen.body().click();
  await userEvent.keyboard(`{End}${text}`);
}

async function publishThroughFlow() {
  await editorScreen.publishButton().click();
  await expect.element(publishScreen.options()).toBeVisible();
  await publishScreen.continueButton().click();
  await publishScreen.confirmButton().click();
}

afterEach(() => {
  localStorage.removeItem('ghost-last-published-post');
  localStorage.removeItem('ghost-last-scheduled-post');
  delete window.EmberBridge;
});

/**
 * The editor header's publish and preview actions, wired to the save engine:
 * the buttons a role may use, the flows they open, and the writes those flows
 * make.
 */
describe('Editor header actions', () => {
  it(
    'publishes a draft and keeps the editor open on the new status',
    async () => {
      publishChrome();
      const saveApi = fakeSavablePost();
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);

      await expect.element(editorScreen.publishButton()).toBeEnabled();
      await publishThroughFlow();

      await expect.element(publishScreen.complete()).toBeVisible();
      expect(submittedPost(saveApi)).toMatchObject({ id: POST_ID, status: 'published' });
      // The header never PUTs on its own: the publish is the only write.
      expect(saveApi.requests).toHaveLength(1);

      await expect.element(editorScreen.root()).toBeVisible();
      await expect.element(editorScreen.status()).toHaveTextContent('Published');
    },
    SLOW,
  );

  it(
    'sends the newsletter the publish flow selected',
    async () => {
      publishChrome({ newsletters: 1 });
      const saveApi = fakeSavablePost();
      await renderAdminApp(`/editor/post/${POST_ID}`, MAILGUN_ON);

      await expect.element(editorScreen.publishButton()).toBeEnabled();
      await publishThroughFlow();

      await expect.element(publishScreen.complete()).toBeVisible();
      expect(submittedPost(saveApi)).toMatchObject({ status: 'published' });
      expect(saveApi.lastRequest?.url).toContain('newsletter=weekly');
      expect(saveApi.lastRequest?.url).toContain('email_segment=all');
    },
    SLOW,
  );

  it(
    'schedules a draft for the time the flow chose',
    async () => {
      publishChrome();
      const saveApi = fakeSavablePost();
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);

      await editorScreen.publishButton().click();
      await publishScreen.setting('publish-at').click();
      await page.getByLabelText('Schedule for later').click();
      await publishScreen.continueButton().click();
      await publishScreen.confirmButton().click();

      await expect.element(publishScreen.complete()).toBeVisible();
      const submitted = submittedPost(saveApi);
      expect(submitted).toMatchObject({ status: 'scheduled' });
      expect(Date.parse(String(submitted.published_at))).toBeGreaterThan(Date.now());
    },
    SLOW,
  );

  it(
    'saves unsaved work on a published post through Update',
    async () => {
      publishChrome();
      const saveApi = fakeSavablePost({
        status: 'published',
        published_at: '2026-02-01T10:00:00.000Z',
      });
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);

      await expect.element(editorScreen.body()).toHaveTextContent('Hello from React');
      // A published post has nothing to update until it is edited.
      await expect.element(editorScreen.updateButton()).toBeDisabled();

      await typeIntoBody(' and more');
      await expect.element(editorScreen.updateButton()).toBeEnabled();
      await editorScreen.updateButton().click();

      await expect.poll(() => saveApi.requests.length, SAVE_POLL).toBe(1);
      expect(submittedPost(saveApi)).toMatchObject({ id: POST_ID, status: 'published' });
      // An explicit save asks the server for a revision; a background one never does.
      expect(saveApi.lastRequest?.url).toContain('save_revision=true');
    },
    SLOW,
  );

  it(
    'reverts a published post to a draft through the update flow',
    async () => {
      publishChrome();
      const saveApi = fakeSavablePost({
        status: 'published',
        published_at: '2026-02-01T10:00:00.000Z',
      });
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);

      await editorScreen.unpublishButton().click();
      await expect.element(publishScreen.updateFlow()).toBeVisible();
      await publishScreen.revertToDraft().click();

      await expect.poll(() => saveApi.requests.length, SAVE_POLL).toBe(1);
      expect(submittedPost(saveApi)).toMatchObject({ id: POST_ID, status: 'draft' });
      await expect.element(editorScreen.publishButton()).toBeVisible();
    },
    SLOW,
  );

  it(
    'unschedules a scheduled post',
    async () => {
      publishChrome();
      const saveApi = fakeSavablePost({
        status: 'scheduled',
        published_at: '2030-02-01T10:00:00.000Z',
      });
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);

      await editorScreen.unscheduleButton().click();
      await expect.element(publishScreen.updateFlow()).toBeVisible();
      await publishScreen.revertToDraft().click();

      await expect.poll(() => saveApi.requests.length, SAVE_POLL).toBe(1);
      expect(submittedPost(saveApi)).toMatchObject({ status: 'draft', published_at: null });
    },
    SLOW,
  );

  it(
    'offers a contributor Save and Preview but never Publish',
    async () => {
      publishChrome();
      fakeSavablePost();
      await renderAdminApp(`/editor/post/${POST_ID}`, asRole('Contributor'));

      await expect.element(editorScreen.saveButton()).toBeVisible();
      await expect.element(editorScreen.previewButton()).toBeVisible();
      await expect(editorScreen.publishButton()).toHaveCount(0);
    },
    SLOW,
  );

  it(
    'saves a dirty draft before previewing it',
    async () => {
      publishChrome();
      const held = deferred<void>();
      const saveApi = fakeSavablePost({}, { holdFirstSave: held.promise });
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);

      await expect.element(editorScreen.body()).toHaveTextContent('Hello from React');
      await typeIntoBody(' and more');
      await editorScreen.previewButton().click();

      // The save the preview waits on is in flight, so nothing is rendered yet.
      await expect.element(previewScreen.modal()).toBeVisible();
      await expect.poll(() => saveApi.requests.length, SAVE_POLL).toBe(1);
      await expect(previewScreen.browserFrame()).toHaveCount(0);

      held.resolve();
      await expect
        .element(previewScreen.browserFrame())
        .toHaveAttribute('src', `${SITE_URL}/p/${POST_UUID}/?member_status=free`);
    },
    SLOW,
  );

  it(
    'toggles the preview with the keyboard shortcut',
    async () => {
      publishChrome();
      fakeSavablePost();
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);

      await expect.element(editorScreen.previewButton()).toBeVisible();
      await userEvent.keyboard('{Meta>}p{/Meta}');
      await expect.element(previewScreen.modal()).toBeVisible();

      // A flow opened under the preview is unreachable, so the chord does nothing here.
      await userEvent.keyboard('{Meta>}{Shift>}p{/Shift}{/Meta}');
      await expect(publishScreen.options()).toHaveCount(0);

      await userEvent.keyboard('{Meta>}p{/Meta}');
      await expect(previewScreen.modal()).toHaveCount(0);
    },
    SLOW,
  );

  it(
    'keeps the failure in the publish flow and sends nothing more',
    async () => {
      publishChrome();
      const saveApi = fakeSavablePost({}, { failWith: 422 });
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);

      await expect.element(editorScreen.publishButton()).toBeEnabled();
      await publishThroughFlow();

      await expect.element(publishScreen.confirmError()).toHaveTextContent('Validation failed');
      await expect(publishScreen.complete()).toHaveCount(0);
      expect(saveApi.requests).toHaveLength(1);
    },
    SLOW,
  );
  it(
    'offers no preview once the post has been published',
    async () => {
      publishChrome();
      fakeSavablePost({ status: 'published', published_at: '2026-02-01T10:00:00.000Z' });
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);

      await expect.element(editorScreen.updateButton()).toBeVisible();
      await expect(editorScreen.previewButton()).toHaveCount(0);

      // Nothing is bound to the chord, so the browser keeps its print dialog.
      await userEvent.keyboard('{Meta>}p{/Meta}');
      await expect(previewScreen.modal()).toHaveCount(0);
    },
    SLOW,
  );

  it(
    'opens the publish flow with the keyboard shortcut',
    async () => {
      publishChrome();
      fakeSavablePost();
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);

      await expect.element(editorScreen.publishButton()).toBeEnabled();
      await userEvent.keyboard('{Meta>}{Shift>}p{/Shift}{/Meta}');

      await expect.element(publishScreen.options()).toBeVisible();
      await expect(previewScreen.modal()).toHaveCount(0);
    },
    SLOW,
  );

  it(
    'keeps the publish flow and its choices while previewing from inside it',
    async () => {
      publishChrome({ newsletters: 1 });
      const saveApi = fakeSavablePost();
      await renderAdminApp(`/editor/post/${POST_ID}`, MAILGUN_ON);

      await editorScreen.publishButton().click();
      await publishScreen.setting('publish-type').click();
      await page.getByLabelText('Publish only').click();

      await publishScreen.previewButton().click();
      await expect.element(previewScreen.modal()).toBeVisible();
      await previewScreen.publishButton().click();
      await expect(previewScreen.modal()).toHaveCount(0);

      // A restarted flow would default back to publishing and emailing.
      await expect.element(publishScreen.options()).toBeVisible();
      await publishScreen.continueButton().click();
      await publishScreen.confirmButton().click();

      await expect.element(publishScreen.complete()).toBeVisible();
      expect(submittedPost(saveApi)).toMatchObject({ status: 'published' });
      expect(saveApi.lastRequest?.url).not.toContain('newsletter=');
    },
    SLOW,
  );

  it(
    'keeps the open publish flow and its choices while an input refetches',
    async () => {
      publishChrome();
      const refetched = deferred<void>();
      let newsletterReads = 0;
      // Registered after publishChrome's newsletters fake, so this one answers.
      fakeAdminEndpoint('GET', /^\/newsletters\//, async () => {
        newsletterReads += 1;
        if (newsletterReads > 1) {
          await refetched.promise;
        }
        return browseResponse(
          'newsletters',
          [newsletter({ slug: 'weekly', name: 'Weekly', status: 'active' })],
          { limit: 'all' },
        );
      });
      const saveApi = fakeSavablePost();
      const emberSaved = installEmberBridge();
      await renderAdminApp(`/editor/post/${POST_ID}`, MAILGUN_ON);

      await editorScreen.publishButton().click();
      await publishScreen.setting('publish-type').click();
      await page.getByLabelText('Publish only').click();

      // Ember saving a newsletter invalidates the input the flow was built from.
      emberSaved('newsletter');
      await expect.poll(() => newsletterReads).toBe(2);
      await expect.element(publishScreen.options()).toBeVisible();

      refetched.resolve();
      await publishScreen.continueButton().click();
      await publishScreen.confirmButton().click();

      // A remounted flow would default back to publishing and emailing.
      await expect.element(publishScreen.complete()).toBeVisible();
      expect(saveApi.lastRequest?.url).not.toContain('newsletter=');
    },
    SLOW,
  );

  it(
    'offers a retry when the publish inputs fail to load',
    async () => {
      publishChrome();
      fakeSavablePost();
      fakeAdminEndpoint(
        'GET',
        /^\/newsletters\//,
        { errors: [{ type: 'InternalServerError', message: 'Newsletters are unavailable.' }] },
        { status: 500 },
      );
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);

      await expect.element(editorScreen.publishInputsError()).toHaveTextContent('went wrong');
      await expect.element(editorScreen.publishInputsError()).toHaveAttribute('role', 'alert');
      await expect.element(editorScreen.publishButton()).toBeDisabled();

      // The retry re-reads the same endpoint, which now answers.
      fakeAdminEndpoint(
        'GET',
        /^\/newsletters\//,
        browseResponse('newsletters', [], {
          limit: 'all',
        }),
      );
      await editorScreen.retryPublishInputs().click();

      await expect.element(editorScreen.publishButton()).toBeEnabled();
      await expect(editorScreen.publishInputsError()).toHaveCount(0);
    },
    SLOW,
  );

  it(
    'returns to the publish flow when the preview it opened is closed',
    async () => {
      publishChrome();
      fakeSavablePost();
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);

      await editorScreen.publishButton().click();
      await publishScreen.previewButton().click();
      await expect.element(previewScreen.modal()).toBeVisible();

      await previewScreen.closeButton().click();

      await expect(previewScreen.modal()).toHaveCount(0);
      await expect.element(publishScreen.options()).toBeVisible();
    },
    SLOW,
  );

  it(
    'saves unsaved work before the publish it carries',
    async () => {
      publishChrome();
      const saveApi = fakeSavablePost();
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);

      await expect.element(editorScreen.body()).toHaveTextContent('Hello from React');
      await typeIntoBody(' and more');
      await publishThroughFlow();

      await expect.element(publishScreen.complete()).toBeVisible();
      expect(saveApi.requests).toHaveLength(2);
      expect(submittedPost(saveApi, 0)).toMatchObject({ status: 'draft' });
      expect(saveApi.requests[0].url).toContain('save_revision=true');
      expect(submittedPost(saveApi, 1)).toMatchObject({ status: 'published' });
    },
    SLOW,
  );

  it(
    'holds the publish flow on the confirm step when the session expired',
    async () => {
      publishChrome();
      const saveApi = fakeSavablePost({}, { failWith: 401 });
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);

      await expect.element(editorScreen.publishButton()).toBeEnabled();
      await publishThroughFlow();

      await expect.element(editorScreen.reauthBanner()).toHaveTextContent('Your session expired');
      // The engine holds the publish until the session is restored, so the flow waits with it.
      await expect.element(publishScreen.confirm()).toBeVisible();
      await expect(publishScreen.complete()).toHaveCount(0);
      expect(saveApi.requests).toHaveLength(1);
    },
    SLOW,
  );

  it(
    'reports a collision in the publish flow and sends nothing more',
    async () => {
      publishChrome();
      const saveApi = fakeSavablePost({}, { failWith: 409 });
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);

      await expect.element(editorScreen.publishButton()).toBeEnabled();
      await publishThroughFlow();

      await expect
        .element(publishScreen.confirmError())
        .toHaveTextContent('Someone else has edited this post');
      await expect(publishScreen.complete()).toHaveCount(0);
      expect(saveApi.requests).toHaveLength(1);
    },
    SLOW,
  );
});
