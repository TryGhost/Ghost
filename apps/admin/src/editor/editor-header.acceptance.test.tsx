import { afterEach, describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { buildLexicalParagraph } from '@tryghost/test-data';
import { publishTypeError } from '@tryghost/test-data/selectors/editor';

import {
  browseResponse,
  configResponse,
  currentRoute,
  currentUserResponse,
  fakeAdminEndpoint,
  fakeAdminStats,
  fakeEmailPreview,
  fakeNewsletters,
  fakePages,
  fakePosts,
  fakePostsListScreen,
  fakeSnippets,
  fakeTiers,
  newsletter,
  post,
  renderAdminApp,
  settingsResponse,
  staffRole,
  submittedPost,
  withoutAutosave,
  type StaffRoleName,
} from '@test-utils/acceptance';
import { editorScreen } from '@/editor/editor.screen';
import type { EmberDataChangeEvent } from '@/ember-bridge';
import { deferred } from '@/utils/deferred';
import { previewScreen } from '@/editor/preview/preview.screen';
import { CONFLICT_MESSAGE } from '@/editor/publish/completion-message';
import { publishScreen } from '@/editor/publish/publish.screen';
import { POST_DELETED } from '@/editor/session/error-mapping';

const POST_ID = 'abc123';
const POST_UUID = 'post-uuid';
const FLAG_ON = { labs: { editorReact: true } };
const LOADED_AT = '2026-01-01T00:00:00.000Z';
const SITE_URL = 'http://test.com';

const SAVE_POLL = { timeout: 10_000 };
const CURRENT_USER_ID = String(currentUserResponse().users[0].id);

const MAILGUN_SETTINGS = {
  mailgun_domain: 'mail.test.com',
  mailgun_api_key: 'key',
  mailgun_base_url: 'https://api.mailgun.net/v3',
};

/** A site whose bulk email provider is configured, so the flow offers a send. */
const MAILGUN_ON = {
  ...FLAG_ON,
  boot: {
    browseSettings: { response: settingsResponse({ settings: MAILGUN_SETTINGS }) },
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

  if (status === 404) {
    return { errors: [{ type: 'NotFoundError', message: 'Post not found.' }] };
  }

  return { errors: [{ type: 'ValidationError', message: 'Title cannot be that long.' }] };
}

/** Every read the header's publish inputs and preview make beyond the boot table. */
function publishChrome({ newsletters = 0 } = {}) {
  fakeSnippets([]);
  fakeEmailPreview();
  fakePosts([]);
  fakePages([]);
  fakePostsListScreen();
  // Successful sends leave the editor for the post's analytics screen.
  fakeAdminStats.postReferrers(POST_ID, []);
  fakeAdminStats.postGrowth(POST_ID);
  fakeAdminStats.mrr();
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

/** Newsletters answer 500, which fails the header's publish inputs. */
function failNewsletters() {
  fakeAdminEndpoint(
    'GET',
    /^\/newsletters\//,
    { errors: [{ type: 'InternalServerError', message: 'Newsletters are unavailable.' }] },
    { status: 500 },
  );
}

/** Newsletters answer again, so a retry of the publish inputs succeeds. */
function restoreNewsletters() {
  fakeAdminEndpoint('GET', /^\/newsletters\//, browseResponse('newsletters', [], { limit: 'all' }));
}

/** The publish flow's email confirmation reads the post with its email alone. */
function isEmailConfirmationRead(url: string): boolean {
  return new URL(url).searchParams.get('include') === 'email';
}

/**
 * A post that answers saves the way Ghost does: the response carries the
 * submitted fields back with a fresh collision token, and the read endpoint
 * serves whatever was saved last.
 */
function fakeSavablePost(
  overrides: Partial<SavedPost> = {},
  {
    failWith = 0,
    holdFirstSave,
    resource = 'posts',
  }: { failWith?: number; holdFirstSave?: Promise<void>; resource?: 'posts' | 'pages' } = {},
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

  fakeAdminEndpoint('GET', new RegExp(`^/${resource}/${POST_ID}/\\?`), ({ url }) => {
    // The send has gone out by the time the flow's email confirmation reads the post.
    if (current.email?.status === 'pending' && isEmailConfirmationRead(url)) {
      current.email = { ...current.email, status: 'submitted', error: null };
    }
    return { [resource]: [current] };
  });

  const saveApi = fakeAdminEndpoint(
    'PUT',
    new RegExp(`^/${resource}/${POST_ID}/\\?`),
    async ({ body, url }) => {
      saves += 1;

      if (holdFirstSave && saves === 1) {
        await holdFirstSave;
      }

      if (failWith) {
        return failureBody(failWith);
      }

      const submitted = (body as Record<string, Partial<SavedPost>[]>)[resource][0];
      current = { ...current, ...submitted, updated_at: `2026-01-01T00:00:0${saves}.000Z` };

      // Core creates a send's email pending and hands it over in the background.
      if (url.includes('newsletter=')) {
        current.email = { id: 'email-1', status: 'pending', email_count: 20, opened_count: 0 };
      }

      return { [resource]: [current] };
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
  it('returns to the post list after publishing without email', async () => {
    publishChrome();
    const saveApi = fakeSavablePost();
    await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);

    await expect.element(editorScreen.publishButton()).toBeEnabled();
    await publishThroughFlow();

    await expect.poll(currentRoute).toBe('/posts');
    expect(submittedPost(saveApi)).toMatchObject({ id: POST_ID, status: 'published' });
    // The header never PUTs on its own: the publish is the only write.
    expect(saveApi.requests).toHaveLength(1);

    await expect(editorScreen.root()).toHaveCount(0);
  });

  it('sends the newsletter the publish flow selected', async () => {
    publishChrome({ newsletters: 1 });
    const saveApi = fakeSavablePost();
    await renderAdminApp(`/editor/post/${POST_ID}`, MAILGUN_ON);

    await expect.element(editorScreen.publishButton()).toBeEnabled();
    await publishThroughFlow();

    await expect.poll(currentRoute).toBe(`/posts/analytics/${POST_ID}`);
    expect(submittedPost(saveApi)).toMatchObject({ status: 'published' });
    expect(saveApi.lastRequest?.url).toContain('newsletter=weekly');
    expect(saveApi.lastRequest?.url).toContain('email_segment=all');
  });

  it('opens post analytics once the flow confirms the email send', async () => {
    publishChrome({ newsletters: 1 });
    const saveApi = fakeSavablePost();
    await renderAdminApp(`/editor/post/${POST_ID}`, MAILGUN_ON);

    await expect.element(editorScreen.publishButton()).toBeEnabled();
    await editorScreen.publishButton().click();
    await expect
      .element(publishScreen.setting('publish-type'))
      .toHaveTextContent('Publish and email');
    await publishScreen.continueButton().click();
    await publishScreen.confirmButton().click();

    await expect.poll(currentRoute).toBe(`/posts/analytics/${POST_ID}`);
    expect(saveApi.lastRequest?.url).toContain('newsletter=weekly');
    await expect(editorScreen.root()).toHaveCount(0);
  });

  it('schedules a draft for the time the flow chose', async () => {
    publishChrome();
    const saveApi = fakeSavablePost();
    await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);

    await editorScreen.publishButton().click();
    await publishScreen.setting('publish-at').click();
    await page.getByLabelText('Schedule for later').click();
    await publishScreen.continueButton().click();
    await publishScreen.confirmButton().click();

    await expect.poll(currentRoute).toBe('/posts');
    const submitted = submittedPost(saveApi);
    expect(submitted).toMatchObject({ status: 'scheduled' });
    expect(Date.parse(String(submitted.published_at))).toBeGreaterThan(Date.now());
  });

  it('returns scheduled emails to the post list instead of analytics', async () => {
    publishChrome({ newsletters: 1 });
    fakeSavablePost();
    await renderAdminApp(`/editor/post/${POST_ID}`, MAILGUN_ON);

    await editorScreen.publishButton().click();
    await publishScreen.setting('publish-at').click();
    await page.getByLabelText('Schedule for later').click();
    await publishScreen.continueButton().click();
    await publishScreen.confirmButton().click();

    await expect.poll(currentRoute).toBe('/posts');
    await expect(editorScreen.root()).toHaveCount(0);
  });

  it.each([false, true])('returns pages to the page list (scheduled: %s)', async (scheduled) => {
    publishChrome();
    fakeSavablePost({}, { resource: 'pages' });
    await renderAdminApp(`/editor/page/${POST_ID}`, FLAG_ON);

    await editorScreen.publishButton().click();
    if (scheduled) {
      await publishScreen.setting('publish-at').click();
      await page.getByLabelText('Schedule for later').click();
    }
    await publishScreen.continueButton().click();
    await publishScreen.confirmButton().click();

    await expect.poll(currentRoute).toBe('/pages');
    await expect(editorScreen.root()).toHaveCount(0);
  });

  it('opens analytics after an email-only send', async () => {
    publishChrome({ newsletters: 1 });
    const saveApi = fakeSavablePost();
    await renderAdminApp(`/editor/post/${POST_ID}`, MAILGUN_ON);

    await editorScreen.publishButton().click();
    await publishScreen.setting('publish-type').click();
    await page.getByLabelText('Email only').click();
    await publishScreen.continueButton().click();
    await publishScreen.confirmButton().click();

    await expect.poll(currentRoute).toBe(`/posts/analytics/${POST_ID}`);
    expect(submittedPost(saveApi)).toMatchObject({ status: 'published', email_only: true });
    await expect(editorScreen.root()).toHaveCount(0);
  });

  it('opens analytics when republishing a previously emailed post', async () => {
    publishChrome({ newsletters: 1 });
    const saveApi = fakeSavablePost({
      email: { id: 'email-1', status: 'submitted', email_count: 20, opened_count: 0 },
    });
    await renderAdminApp(`/editor/post/${POST_ID}`, MAILGUN_ON);

    await publishThroughFlow();

    await expect.poll(currentRoute).toBe(`/posts/analytics/${POST_ID}`);
    expect(saveApi.lastRequest?.url).not.toContain('newsletter=');
    await expect(editorScreen.root()).toHaveCount(0);
  });

  it('saves unsaved work on a published post through Update', async () => {
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
  });

  it('reverts a published post to a draft through the update flow', async () => {
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
    await expect.element(editorScreen.saveToast('Post reverted to a draft.')).toBeVisible();
  });

  it('unschedules a scheduled post', async () => {
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
    await expect.element(editorScreen.saveToast('Post reverted to a draft.')).toBeVisible();
  });

  it('reverts a published page to a draft and says so', async () => {
    publishChrome();
    fakeSavablePost(
      { status: 'published', published_at: '2026-02-01T10:00:00.000Z' },
      { resource: 'pages' },
    );
    await renderAdminApp(`/editor/page/${POST_ID}`, FLAG_ON);

    await editorScreen.unpublishButton().click();
    await publishScreen.revertToDraft().click();

    await expect.element(editorScreen.saveToast('Page reverted to a draft.')).toBeVisible();
  });

  it('steps the Update button through its save and reports the update with a link', async () => {
    publishChrome();
    const held = deferred<void>();
    fakeSavablePost(
      { status: 'published', published_at: '2026-02-01T10:00:00.000Z' },
      { holdFirstSave: held.promise },
    );
    await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);

    await typeIntoBody(' and more');
    await editorScreen.updateButton().click();

    await expect.element(editorScreen.headerButton('Updating...')).toBeVisible();
    await expect(editorScreen.saveToast('Post updated')).toHaveCount(0);
    held.resolve();

    await expect.element(editorScreen.headerButton('Updated')).toBeVisible();
    const toast = editorScreen.saveToast('Post updated');
    await expect.element(toast).toBeVisible();
    await expect
      .element(toast.getByRole('link', { name: 'View on site' }))
      .toHaveAttribute('href', `${SITE_URL}/hello-from-react/`);
    await expect.element(editorScreen.headerButton('Update'), { timeout: 5_000 }).toBeDisabled();
  });

  it('offers Retry on the Update button when the save fails, with no toast', async () => {
    publishChrome();
    fakeSavablePost(
      { status: 'published', published_at: '2026-02-01T10:00:00.000Z' },
      { failWith: 422 },
    );
    await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);

    await typeIntoBody(' and more');
    await editorScreen.updateButton().click();

    await expect.element(editorScreen.headerButton('Retry')).toBeEnabled();
    await expect(editorScreen.saveToast('Post updated')).toHaveCount(0);
  });

  it('reports a scheduled update with its audience and time in the site timezone', async () => {
    publishChrome({ newsletters: 1 });
    fakeSavablePost({
      status: 'scheduled',
      published_at: '2030-02-01T10:00:00.000Z',
      newsletter: newsletter({ slug: 'weekly', name: 'Weekly', status: 'active' }),
      email_segment: 'all',
    });
    await renderAdminApp(`/editor/post/${POST_ID}`, {
      ...FLAG_ON,
      boot: {
        browseSettings: { response: settingsResponse({ settings: { timezone: 'Europe/Berlin' } }) },
      },
    });

    await typeIntoBody(' and more');
    await editorScreen.updateButton().click();

    const toast = editorScreen.saveToast('Post scheduled');
    await expect
      .element(toast)
      .toHaveTextContent(
        'Will be published and delivered to 20 members on 1 Feb 2030 at 11:00 (UTC+1)',
      );
    await expect
      .element(toast.getByRole('link', { name: 'Show preview' }))
      .toHaveAttribute('href', `${SITE_URL}/p/${POST_UUID}/`);
  });

  it('reports a Cmd-S update without stepping the Update button', async () => {
    publishChrome();
    fakeSavablePost({ status: 'published', published_at: '2026-02-01T10:00:00.000Z' });
    await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);

    await typeIntoBody(' and more');
    await userEvent.keyboard('{Meta>}s{/Meta}');

    await expect.element(editorScreen.saveToast('Post updated')).toBeVisible();
    await expect.element(editorScreen.headerButton('Update')).toBeDisabled();
  });

  it('steps a contributor’s Save button through its save and reports the saved draft', async () => {
    publishChrome();
    const held = deferred<void>();
    fakeSavablePost({}, { holdFirstSave: held.promise });
    await renderAdminApp(`/editor/post/${POST_ID}`, withoutAutosave(asRole('Contributor')));

    await typeIntoBody(' and more');
    await editorScreen.saveButton().click();

    await expect.element(editorScreen.headerButton('Saving')).toBeVisible();
    held.resolve();

    await expect.element(editorScreen.headerButton('Saved')).toBeVisible();
    await expect.element(editorScreen.saveToast('Post saved')).toBeVisible();
    await expect.element(editorScreen.headerButton('Save'), { timeout: 5_000 }).toBeVisible();
  });

  it('offers a contributor Save and Preview but never Publish', async () => {
    publishChrome();
    fakeSavablePost();
    await renderAdminApp(`/editor/post/${POST_ID}`, asRole('Contributor'));

    await expect.element(editorScreen.saveButton()).toBeVisible();
    await expect.element(editorScreen.previewButton()).toBeVisible();
    await expect(editorScreen.publishButton()).toHaveCount(0);
  });

  it('saves a dirty draft before previewing it', async () => {
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
  });

  it('toggles the preview with the keyboard shortcut', async () => {
    publishChrome();
    fakeSavablePost();
    await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);

    await expect.element(editorScreen.previewButton()).toBeVisible();
    await userEvent.keyboard('{Meta>}p{/Meta}');
    await expect.element(previewScreen.modal()).toBeVisible();

    // The publish chord is off while the preview is open.
    await userEvent.keyboard('{Meta>}{Shift>}p{/Shift}{/Meta}');
    await expect(publishScreen.options()).toHaveCount(0);

    await userEvent.keyboard('{Meta>}p{/Meta}');
    await expect(previewScreen.modal()).toHaveCount(0);
  });

  it.each(['Enter', 'Tab'])(
    'saves the email subject from preview on %s and keeps it when reopened',
    async (key) => {
      publishChrome({ newsletters: 1 });
      const saveApi = fakeSavablePost({ email_subject: null });
      fakeAdminEndpoint('GET', /^\/email_previews\/posts\//, {
        email_previews: [
          { subject: 'Hello from React', html: '<p>Email body</p>', plaintext: 'Email body' },
        ],
      });
      await renderAdminApp(`/editor/post/${POST_ID}`, MAILGUN_ON);
      await editorScreen.previewButton().click();
      await previewScreen.emailTab().click();
      await expect.element(previewScreen.emailSubject()).toHaveValue('Hello from React');

      await previewScreen.emailSubject().fill('A custom email subject');
      await expect.element(previewScreen.testEmailButton()).toBeDisabled();
      await userEvent.keyboard(`{${key}}`);
      await expect.poll(() => submittedPost(saveApi)?.email_subject).toBe('A custom email subject');
      // A settings field's save, which never asks the server for a revision.
      expect(saveApi.lastRequest?.url).not.toContain('save_revision');
      await expect.element(previewScreen.testEmailButton()).toBeEnabled();
      await previewScreen.closeButton().click();
      await editorScreen.previewButton().click();
      await previewScreen.emailTab().click();
      await expect.element(previewScreen.emailSubject()).toHaveValue('A custom email subject');

      await previewScreen.emailSubject().fill('');
      await userEvent.keyboard('{Tab}');
      await expect.poll(() => saveApi.requests.length).toBe(2);
      expect(submittedPost(saveApi, 1)).toMatchObject({ email_subject: null });
      await expect.element(previewScreen.emailSubject()).toHaveValue('Hello from React');
      await expect
        .element(previewScreen.emailSubject())
        .toHaveAttribute('placeholder', 'Hello from React');
    },
  );

  it('offers the title, cut to 40 characters, as the email subject’s placeholder', async () => {
    publishChrome({ newsletters: 1 });
    const title = 'An unusually long title for this week’s newsletter';
    fakeSavablePost({ title, email_subject: null });
    fakeAdminEndpoint('GET', /^\/email_previews\/posts\//, {
      email_previews: [{ subject: title, html: '<p>Email body</p>', plaintext: 'Email body' }],
    });
    await renderAdminApp(`/editor/post/${POST_ID}`, MAILGUN_ON);
    await editorScreen.previewButton().click();
    await previewScreen.emailTab().click();

    await expect.element(previewScreen.emailSubject()).toHaveValue(title);
    await previewScreen.emailSubject().fill('');
    await expect
      .element(previewScreen.emailSubject())
      .toHaveAttribute('placeholder', 'An unusually long title for this week...');
  });

  it('gives a contributor no email subject to edit', async () => {
    publishChrome({ newsletters: 1 });
    fakeSavablePost();
    await renderAdminApp(`/editor/post/${POST_ID}`, asRole('Contributor'));
    await editorScreen.previewButton().click();

    await expect.element(previewScreen.browserFrame()).toBeVisible();
    await expect(previewScreen.emailTab()).toHaveCount(0);
    await expect(previewScreen.emailSubject()).toHaveCount(0);
  });

  it('keeps an invalid email subject editable without saving or enabling test sends', async () => {
    publishChrome({ newsletters: 1 });
    const saveApi = fakeSavablePost();
    fakeAdminEndpoint('GET', /^\/email_previews\/posts\//, {
      email_previews: [
        { subject: 'Hello from React', html: '<p>Email body</p>', plaintext: 'Email body' },
      ],
    });
    await renderAdminApp(`/editor/post/${POST_ID}`, MAILGUN_ON);
    await editorScreen.previewButton().click();
    await previewScreen.emailTab().click();
    await previewScreen.emailSubject().fill('a'.repeat(301));
    await userEvent.keyboard('{Enter}');
    await expect.element(previewScreen.emailSubject()).toHaveAttribute('aria-invalid', 'true');
    await expect
      .element(page.getByRole('alert'))
      .toHaveTextContent('Email subject cannot be longer than 300 characters.');
    await expect.element(previewScreen.testEmailButton()).toBeDisabled();
    expect(saveApi.requests).toHaveLength(0);

    await previewScreen.emailSubject().fill('a'.repeat(300));
    await userEvent.keyboard('{Enter}');
    await expect.poll(() => submittedPost(saveApi)?.email_subject).toBe('a'.repeat(300));
    await expect.element(previewScreen.testEmailButton()).toBeEnabled();
  });

  it.each(['Close', 'Escape'])(
    'recovers an invalid subject after leaving preview with %s',
    async (dismiss) => {
      publishChrome({ newsletters: 1 });
      const saveApi = fakeSavablePost();
      fakeAdminEndpoint('GET', /^\/email_previews\/posts\//, {
        email_previews: [
          { subject: 'Hello from React', html: '<p>Email body</p>', plaintext: 'Email body' },
        ],
      });
      await renderAdminApp(`/editor/post/${POST_ID}`, withoutAutosave(MAILGUN_ON));
      await editorScreen.previewButton().click();
      await previewScreen.emailTab().click();
      await previewScreen.emailSubject().fill('a'.repeat(301));
      if (dismiss === 'Close') {
        await previewScreen.closeButton().click();
      } else {
        await userEvent.keyboard('{Escape}');
      }
      await expect(previewScreen.modal()).toHaveCount(0);
      await editorScreen.titleInput().fill('Keep this title edit');
      await editorScreen.previewButton().click();
      await expect.element(previewScreen.saveFailed()).toBeVisible();
      await expect(previewScreen.browserFrame()).toHaveCount(0);
      await expect(previewScreen.emailFrame()).toHaveCount(0);
      await expect.element(previewScreen.shareButton()).toBeDisabled();
      await expect.element(previewScreen.emailSubject()).toHaveValue('a'.repeat(301));
      await expect.element(previewScreen.emailSubject()).toHaveAttribute('aria-invalid', 'true');
      expect(saveApi.requests).toHaveLength(0);

      await previewScreen.emailSubject().fill('A corrected subject');
      await userEvent.keyboard('{Enter}');
      await expect(saveApi).toHaveSavedFields({
        email_subject: 'A corrected subject',
        title: 'Keep this title edit',
      });
      await expect(previewScreen.saveFailed()).toHaveCount(0);
      await expect.element(previewScreen.emailFrame()).toBeVisible();
      await expect.element(previewScreen.testEmailButton()).toBeEnabled();
      await expect.element(previewScreen.shareButton()).toBeEnabled();
    },
  );

  it('retains the subject and blocks test sends when saving fails', async () => {
    publishChrome({ newsletters: 1 });
    const saveApi = fakeSavablePost({}, { failWith: 422 });
    fakeAdminEndpoint('GET', /^\/email_previews\/posts\//, {
      email_previews: [
        { subject: 'Hello from React', html: '<p>Email body</p>', plaintext: 'Email body' },
      ],
    });
    await renderAdminApp(`/editor/post/${POST_ID}`, MAILGUN_ON);
    await editorScreen.previewButton().click();
    await previewScreen.emailTab().click();
    await previewScreen.emailSubject().fill('Keep this subject');
    await userEvent.keyboard('{Enter}');
    await expect.poll(() => saveApi.requests.length).toBe(1);
    await expect.element(previewScreen.emailSubject()).toHaveAttribute('aria-invalid', 'true');
    await expect.element(previewScreen.emailSubject()).toHaveValue('Keep this subject');
    await expect.element(previewScreen.testEmailButton()).toBeDisabled();
  });

  it.each([
    ['collision', 409, CONFLICT_MESSAGE],
    ['deleted post', 404, POST_DELETED.message],
  ])(
    'keeps a %s beside the subject through a later edit and sends nothing more',
    async (_case, status, message) => {
      publishChrome({ newsletters: 1 });
      const saveApi = fakeSavablePost({}, { failWith: status });
      fakeAdminEndpoint('GET', /^\/email_previews\/posts\//, {
        email_previews: [
          { subject: 'Hello from React', html: '<p>Email body</p>', plaintext: 'Email body' },
        ],
      });
      await renderAdminApp(`/editor/post/${POST_ID}`, MAILGUN_ON);
      await editorScreen.previewButton().click();
      await previewScreen.emailTab().click();
      await previewScreen.emailSubject().fill('First subject');
      await userEvent.keyboard('{Enter}');
      await expect.element(previewScreen.modal().getByRole('alert')).toHaveTextContent(message);
      await expect.element(previewScreen.emailSubject()).toHaveAttribute('aria-invalid', 'true');

      await previewScreen.emailSubject().fill('Second subject');
      await userEvent.keyboard('{Enter}');
      // A save the engine let through would reach the server well within this.
      await new Promise((resolve) => {
        setTimeout(resolve, 500);
      });
      await expect.element(previewScreen.modal().getByRole('alert')).toHaveTextContent(message);
      await expect.element(previewScreen.emailSubject()).toHaveAttribute('aria-invalid', 'true');
      await expect.element(previewScreen.testEmailButton()).toBeDisabled();
      expect(saveApi.requests).toHaveLength(1);
    },
  );

  it('keeps a newer subject while an earlier subject save is pending', async () => {
    publishChrome({ newsletters: 1 });
    const held = deferred<void>();
    const saveApi = fakeSavablePost({}, { holdFirstSave: held.promise });
    fakeAdminEndpoint('GET', /^\/email_previews\/posts\//, {
      email_previews: [
        { subject: 'Hello from React', html: '<p>Email body</p>', plaintext: 'Email body' },
      ],
    });
    await renderAdminApp(`/editor/post/${POST_ID}`, MAILGUN_ON);
    await editorScreen.previewButton().click();
    await previewScreen.emailTab().click();
    await previewScreen.emailSubject().fill('First subject');
    await userEvent.keyboard('{Enter}');
    await expect.poll(() => saveApi.requests.length).toBe(1);
    await previewScreen.emailSubject().fill('Newer subject');
    await userEvent.keyboard('{Enter}');
    await expect.element(previewScreen.testEmailButton()).toBeDisabled();
    held.resolve();
    await expect.poll(() => saveApi.requests.length).toBe(2);
    expect(submittedPost(saveApi, 1)).toMatchObject({ email_subject: 'Newer subject' });
    await expect.element(previewScreen.emailSubject()).toHaveValue('Newer subject');
    await expect.element(previewScreen.testEmailButton()).toBeEnabled();
  });

  it('keeps the failure in the publish flow and sends nothing more', async () => {
    publishChrome();
    const saveApi = fakeSavablePost({}, { failWith: 422 });
    await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);

    await expect.element(editorScreen.publishButton()).toBeEnabled();
    await publishThroughFlow();

    await expect.element(publishScreen.confirmError()).toHaveTextContent('Validation failed');
    await expect(publishScreen.complete()).toHaveCount(0);
    expect(saveApi.requests).toHaveLength(1);
  });
  it('offers no preview once the post has been published', async () => {
    publishChrome();
    fakeSavablePost({ status: 'published', published_at: '2026-02-01T10:00:00.000Z' });
    await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);

    await expect.element(editorScreen.updateButton()).toBeVisible();
    await expect(editorScreen.previewButton()).toHaveCount(0);

    // Nothing is bound to the chord, so the browser keeps its print dialog.
    await userEvent.keyboard('{Meta>}p{/Meta}');
    await expect(previewScreen.modal()).toHaveCount(0);
  });

  it('opens the publish flow with the keyboard shortcut', async () => {
    publishChrome();
    fakeSavablePost();
    await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);

    await expect.element(editorScreen.publishButton()).toBeEnabled();
    await userEvent.keyboard('{Meta>}{Shift>}p{/Shift}{/Meta}');

    await expect.element(publishScreen.options()).toBeVisible();
    await expect(previewScreen.modal()).toHaveCount(0);
  });

  it('animates opening from the editor but switches fullscreen surfaces without animation', async () => {
    publishChrome();
    fakeSavablePost();
    await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);

    await editorScreen.previewButton().click();
    await expect.element(previewScreen.modal()).toBeVisible();
    expect(getComputedStyle(previewScreen.modal().element()).animationName).not.toBe('none');
    await previewScreen.publishButton().click();
    await expect(previewScreen.modal()).toHaveCount(0);
    await expect.element(publishScreen.options()).toBeVisible();
    expect(getComputedStyle(publishScreen.root().element()).animationName).toBe('none');

    await publishScreen.previewButton().click();
    await expect.element(previewScreen.modal()).toBeVisible();
    expect(getComputedStyle(previewScreen.modal().element()).animationName).toBe('none');
    await previewScreen.publishButton().click();
    await expect(previewScreen.modal()).toHaveCount(0);
    expect(getComputedStyle(publishScreen.root().element()).animationName).toBe('none');

    await publishScreen.closeButton().click();
    await editorScreen.publishButton().click();
    await expect.element(publishScreen.options()).toBeVisible();
    expect(getComputedStyle(publishScreen.root().element()).animationName).not.toBe('none');
    await publishScreen.closeButton().click();
    await editorScreen.previewButton().click();
    await expect.element(previewScreen.modal()).toBeVisible();
    expect(getComputedStyle(previewScreen.modal().element()).animationName).not.toBe('none');
  });

  it('keeps the publish flow and its choices while previewing from inside it', async () => {
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

    await expect.poll(currentRoute).toBe('/posts');
    expect(submittedPost(saveApi)).toMatchObject({ status: 'published' });
    expect(saveApi.lastRequest?.url).not.toContain('newsletter=');
  });

  it('keeps the open publish flow and its choices while an input refetches', async () => {
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
    await expect.poll(currentRoute).toBe('/posts');
    expect(saveApi.lastRequest?.url).not.toContain('newsletter=');
  });

  it('offers a retry when the publish inputs fail to load', async () => {
    publishChrome();
    fakeSavablePost();
    failNewsletters();
    await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);

    await expect.element(editorScreen.publishInputsError()).toHaveTextContent('went wrong');
    await expect.element(editorScreen.publishInputsError()).toHaveAttribute('role', 'alert');
    await expect.element(editorScreen.publishButton()).toBeDisabled();

    // The retry re-reads the same endpoint, which now answers.
    restoreNewsletters();
    await editorScreen.retryPublishInputs().click();

    await expect.element(editorScreen.publishButton()).toBeEnabled();
    await expect(editorScreen.publishInputsError()).toHaveCount(0);
  });

  it('offers a retry when the publish inputs fail to load for a failed send', async () => {
    publishChrome();
    fakeSavablePost({
      status: 'published',
      published_at: '2026-02-01T10:00:00.000Z',
      email: {
        id: 'email-1',
        status: 'failed',
        error: 'The email service was unavailable.',
        email_count: 20,
        opened_count: 0,
      },
    });
    failNewsletters();
    await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);

    await expect.element(editorScreen.publishInputsError()).toHaveTextContent('went wrong');
    await expect.element(editorScreen.publishInputsError()).toHaveAttribute('role', 'alert');
    await expect.element(editorScreen.viewNewsletterDetails()).toBeDisabled();

    restoreNewsletters();
    await editorScreen.retryPublishInputs().click();

    await expect.element(editorScreen.viewNewsletterDetails()).toBeEnabled();
    await expect(editorScreen.publishInputsError()).toHaveCount(0);
  });

  it.each([
    ['published', '2026-02-01T10:00:00.000Z', 'unpublishButton'],
    ['scheduled', '2030-02-01T10:00:00.000Z', 'unscheduleButton'],
  ] as const)(
    'offers a retry when the publish inputs fail to load for a %s post',
    async (status, publishedAt, button) => {
      publishChrome();
      fakeSavablePost({ status, published_at: publishedAt });
      failNewsletters();
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);

      await expect.element(editorScreen.publishInputsError()).toHaveTextContent('went wrong');
      await expect.element(editorScreen.publishInputsError()).toHaveAttribute('role', 'alert');

      restoreNewsletters();
      await editorScreen.retryPublishInputs().click();
      await expect(editorScreen.publishInputsError()).toHaveCount(0);

      await editorScreen[button]().click();
      await expect.element(publishScreen.updateFlow()).toBeVisible();
    },
  );

  it.each(['Close', 'Escape', 'preview shortcut'])(
    'returns to the editor when a preview opened from Publish is dismissed with %s',
    async (closeWith) => {
      publishChrome();
      fakeSavablePost();
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);

      await editorScreen.publishButton().click();
      await publishScreen.previewButton().click();
      await expect.element(previewScreen.modal()).toBeVisible();

      if (closeWith === 'Close') {
        await previewScreen.closeButton().click();
      } else {
        await userEvent.keyboard(closeWith === 'Escape' ? '{Escape}' : '{Meta>}p{/Meta}');
      }

      await expect(previewScreen.modal()).toHaveCount(0);
      await expect(publishScreen.root()).toHaveCount(0);
      await expect.element(editorScreen.publishButton()).toHaveFocus();

      await editorScreen.publishButton().click();
      await expect.element(publishScreen.options()).toBeVisible();
      expect(getComputedStyle(publishScreen.root().element()).animationName).not.toBe('none');
    },
  );

  it('publishes from a preview opened by the header Preview button', async () => {
    publishChrome();
    fakeSavablePost();
    await renderAdminApp(`/editor/post/${POST_ID}`, asRole('Owner'));

    await expect.element(editorScreen.publishButton()).toBeEnabled();
    await editorScreen.previewButton().click();
    await expect.element(previewScreen.modal()).toBeVisible();

    await previewScreen.publishButton().click();

    await expect(previewScreen.modal()).toHaveCount(0);
    await expect.element(publishScreen.options()).toBeVisible();
  });

  it('offers a contributor no Publish in the preview', async () => {
    publishChrome();
    fakeSavablePost();
    await renderAdminApp(`/editor/post/${POST_ID}`, asRole('Contributor'));

    await editorScreen.previewButton().click();
    await expect.element(previewScreen.closeButton()).toBeVisible();
    await expect(previewScreen.publishButton()).toHaveCount(0);
  });

  it('disables Publish in the preview until the publish inputs load', async () => {
    publishChrome();
    fakeSavablePost();
    failNewsletters();
    await renderAdminApp(`/editor/post/${POST_ID}`, asRole('Owner'));

    await expect.element(editorScreen.publishButton()).toBeDisabled();
    await editorScreen.previewButton().click();
    await expect.element(previewScreen.modal()).toBeVisible();
    await expect.element(previewScreen.publishButton()).toBeDisabled();

    // The preview is modal, so the header's Retry is reachable once it closes.
    await previewScreen.closeButton().click();
    await expect(previewScreen.modal()).toHaveCount(0);
    restoreNewsletters();
    await editorScreen.retryPublishInputs().click();
    await expect.element(editorScreen.publishButton()).toBeEnabled();
    await expect(publishScreen.options()).toHaveCount(0);

    await editorScreen.previewButton().click();
    await expect.element(previewScreen.publishButton()).toBeEnabled();
    await expect(publishScreen.options()).toHaveCount(0);
  });

  it('saves unsaved work before the publish it carries', async () => {
    publishChrome();
    const saveApi = fakeSavablePost();
    // Only the publish flow's explicit save should win this race, not the autosave timer.
    await renderAdminApp(`/editor/post/${POST_ID}`, withoutAutosave(FLAG_ON));

    await expect.element(editorScreen.body()).toHaveTextContent('Hello from React');
    await typeIntoBody(' and more');
    await publishThroughFlow();

    await expect.poll(currentRoute).toBe('/posts');
    expect(saveApi.requests).toHaveLength(2);
    expect(submittedPost(saveApi, 0)).toMatchObject({ status: 'draft' });
    expect(saveApi.requests[0].url).toContain('save_revision=true');
    expect(submittedPost(saveApi, 1)).toMatchObject({ status: 'published' });
  });

  it('holds the publish on the confirm step until the writer signs in again', async () => {
    publishChrome();
    const saveApi = fakeSavablePost({}, { failWith: 401 });
    const sessionApi = fakeAdminEndpoint('POST', '/session/', () => 'Created', { status: 201 });
    await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);

    await expect.element(editorScreen.publishButton()).toBeEnabled();
    await publishThroughFlow();

    await expect.element(editorScreen.reauthDialog()).toHaveTextContent('Are you still here?');
    // The engine holds the publish until the session is restored, so the flow waits with it.
    await expect.element(publishScreen.confirm()).toBeVisible();
    await expect(publishScreen.complete()).toHaveCount(0);
    expect(saveApi.requests).toHaveLength(1);

    // Saves answer again: declared after the expired fake, so it takes over from it.
    const restoredApi = fakeAdminEndpoint(
      'PUT',
      new RegExp(`^/posts/${POST_ID}/\\?`),
      ({ body }) => ({
        posts: [
          {
            ...post({ id: POST_ID, title: 'Hello from React', slug: 'hello-from-react' }),
            ...(body as { posts: Partial<SavedPost>[] }).posts[0],
            updated_at: '2026-01-01T00:00:01.000Z',
          },
        ],
      }),
    );
    await editorScreen.reauthPassword().fill('hunter22');
    await editorScreen.reauthSignIn().click();

    // A status change is never sent unasked: the flow asks for the confirm again.
    await expect(editorScreen.reauthDialog()).toHaveCount(0);
    expect(sessionApi.requests).toHaveLength(1);
    await expect
      .element(publishScreen.confirmError())
      .toHaveTextContent('Your session was restored. Confirm again to publish.');
    await expect(publishScreen.complete()).toHaveCount(0);
    expect(restoredApi.requests).toHaveLength(0);

    await publishScreen.confirmButton().click();

    await expect.poll(currentRoute).toBe('/posts');
    expect(submittedPost(restoredApi)).toMatchObject({ id: POST_ID, status: 'published' });
    expect(restoredApi.requests).toHaveLength(1);
  });

  it('reports a collision in the publish flow and sends nothing more', async () => {
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
  });

  it('returns focus to the Preview button when the preview closes', async () => {
    publishChrome();
    fakeSavablePost();
    await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);

    await editorScreen.previewButton().click();
    await expect.element(previewScreen.modal()).toBeVisible();

    await expect
      .poll(() => previewScreen.modal().element().contains(document.activeElement))
      .toBe(true);

    await userEvent.keyboard('{Escape}');

    await expect(previewScreen.modal()).toHaveCount(0);
    await expect.element(editorScreen.previewButton()).toHaveFocus();
  });

  it.each(['Escape', 'Close button'] as const)(
    'returns focus to Publish after closing with %s and reopening',
    async (closeWith) => {
      publishChrome();
      fakeSavablePost();
      await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);

      await expect.element(editorScreen.publishButton()).toBeEnabled();
      for (let opening = 0; opening < 2; opening += 1) {
        await editorScreen.publishButton().click();
        await expect.element(publishScreen.options()).toBeVisible();
        await expect
          .poll(() => publishScreen.root().element().contains(document.activeElement))
          .toBe(true);

        if (closeWith === 'Escape') {
          await userEvent.keyboard('{Escape}');
        } else {
          await publishScreen.closeButton().click();
        }

        await expect(publishScreen.root()).toHaveCount(0);
        await expect.element(editorScreen.publishButton()).toHaveFocus();
      }
    },
  );

  it('returns focus to Publish when closed during the publish settings refresh', async () => {
    publishChrome();
    fakeSavablePost();
    await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
    await expect.element(editorScreen.publishButton()).toBeEnabled();

    const refreshedSettings = deferred<void>();
    const settingsApi = fakeAdminEndpoint('GET', /^\/settings\//, async () => {
      await refreshedSettings.promise;
      return settingsResponse({ labs: FLAG_ON.labs });
    });

    try {
      await editorScreen.publishButton().click();
      await expect.element(publishScreen.options()).toBeVisible();
      await expect.poll(() => settingsApi.requests.length).toBeGreaterThan(0);
      await expect.element(editorScreen.publishButton()).toBeEnabled();

      await userEvent.keyboard('{Escape}');
      await expect(publishScreen.root()).toHaveCount(0);
      await expect.element(editorScreen.publishButton()).toHaveFocus();
    } finally {
      refreshedSettings.resolve();
    }
  });

  it('returns focus to the Unpublish button when the update flow closes', async () => {
    publishChrome();
    fakeSavablePost({ status: 'published', published_at: '2026-02-01T10:00:00.000Z' });
    await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);

    await editorScreen.unpublishButton().click();
    await expect.element(publishScreen.updateFlow()).toBeVisible();
    await expect
      .poll(() => publishScreen.updateFlow().element().contains(document.activeElement))
      .toBe(true);

    await userEvent.keyboard('{Escape}');

    await expect(publishScreen.updateFlow()).toHaveCount(0);
    await expect.element(editorScreen.unpublishButton()).toHaveFocus();
  });

  describe('host limits', () => {
    const MEMBERS_LIMIT_MESSAGE =
      'Your plan supports up to 500 members, please upgrade to add more.';
    const EMAILS_LIMIT_MESSAGE =
      'Your plan supports up to 300 email recipients a month, please upgrade to send more.';
    const HOLD_MESSAGE = 'Sending is paused while we review your account.';

    /** The `/config/` a host serves for a plan with a members cap and a monthly email cap. */
    function hostConfig(hostSettings: Record<string, unknown> = {}) {
      const config = configResponse();
      config.config.hostSettings = {
        subscription: { start: '2026-01-01T00:00:00.000Z' },
        limits: {
          members: { max: 500, error: MEMBERS_LIMIT_MESSAGE },
          emails: { maxPeriodic: 300, error: EMAILS_LIMIT_MESSAGE },
        },
        ...hostSettings,
      };
      return config;
    }

    /** Boot as a mail-configured site on that plan, with the given site-wide member total. */
    function onHostPlan({
      members = 20,
      hostSettings,
      settings = {},
    }: {
      members?: number;
      hostSettings?: Record<string, unknown>;
      settings?: Record<string, boolean | string>;
    } = {}) {
      return {
        ...MAILGUN_ON,
        boot: {
          browseSettings: {
            response: settingsResponse({ settings: { ...MAILGUN_SETTINGS, ...settings } }),
          },
          browseConfig: { response: hostConfig(hostSettings) },
          browseMembersCount: {
            response: {
              members: [],
              meta: {
                pagination: { page: 1, limit: 1, pages: 1, total: members, next: null, prev: null },
              },
            },
          },
        },
      };
    }

    /** The emails sent this period, as the limiter counts their recipients. */
    function fakeEmailsSent(recipients: number) {
      return fakeAdminEndpoint('GET', /^\/emails\/\?/, {
        emails: [
          { id: 'email-a', email_count: recipients - 1 },
          { id: 'email-b', email_count: 1 },
        ],
      });
    }

    async function openPublishFlow() {
      await expect.element(editorScreen.publishButton()).toBeEnabled();
      await editorScreen.publishButton().click();
      await expect.element(publishScreen.options()).toBeVisible();
    }

    it('publishes and emails as usual while the site is under its limits', async () => {
      publishChrome({ newsletters: 1 });
      const emailsApi = fakeEmailsSent(100);
      const saveApi = fakeSavablePost();
      await renderAdminApp(`/editor/post/${POST_ID}`, onHostPlan({ members: 20 }));

      await expect.element(editorScreen.publishButton()).toBeEnabled();
      await publishThroughFlow();

      await expect.poll(currentRoute).toBe(`/posts/analytics/${POST_ID}`);
      expect(saveApi.lastRequest?.url).toContain('newsletter=weekly');
      // The count only covers the period the limit measures.
      expect(emailsApi.lastRequest?.url).toContain('filter=created_at%3A%3E%3D%27');
    });

    it('refuses to publish while the site is over its members limit', async () => {
      publishChrome({ newsletters: 1 });
      fakeEmailsSent(100);
      const saveApi = fakeSavablePost();
      await renderAdminApp(`/editor/post/${POST_ID}`, onHostPlan({ members: 600 }));

      await openPublishFlow();

      await expect.element(publishScreen.options()).toHaveTextContent(MEMBERS_LIMIT_MESSAGE);
      await expect
        .element(publishScreen.options().getByRole('link', { name: 'please upgrade' }))
        .toHaveAttribute('href', '#/pro');
      await expect(publishScreen.continueButton()).toHaveCount(0);
      expect(saveApi.requests).toHaveLength(0);
    });

    it('shows the reason the server gave for refusing a publish over a limit', async () => {
      publishChrome();
      fakeEmailsSent(100);
      fakeSavablePost();
      const refusedPublish = fakeAdminEndpoint(
        'PUT',
        new RegExp(`^/posts/${POST_ID}/\\?`),
        {
          errors: [
            {
              type: 'HostLimitError',
              message: 'Host Limit error, cannot edit post.',
              context: MEMBERS_LIMIT_MESSAGE,
            },
          ],
        },
        { status: 403 },
      );
      // The site is under its limit when the flow checks, so only the server refuses.
      await renderAdminApp(`/editor/post/${POST_ID}`, onHostPlan({ members: 20 }));

      await expect.element(editorScreen.publishButton()).toBeEnabled();
      await publishThroughFlow();

      await expect.element(publishScreen.confirmError()).toHaveTextContent(MEMBERS_LIMIT_MESSAGE);
      await expect
        .element(publishScreen.confirmError().getByRole('link', { name: 'please upgrade' }))
        .toHaveAttribute('href', '#/pro');
      await expect(publishScreen.complete()).toHaveCount(0);
      expect(submittedPost(refusedPublish)).toMatchObject({ status: 'published' });
      expect(refusedPublish.requests).toHaveLength(1);
    });

    it('offers no email while a send would exceed the monthly emails limit', async () => {
      publishChrome({ newsletters: 1 });
      fakeEmailsSent(300);
      const saveApi = fakeSavablePost();
      await renderAdminApp(`/editor/post/${POST_ID}`, onHostPlan());

      await openPublishFlow();
      await expect.element(publishScreen.setting('publish-type')).toHaveTextContent('Publish');
      await publishScreen.setting('publish-type').click();

      await expect.element(page.getByRole('radio', { name: 'Publish and email' })).toBeDisabled();
      await expect.element(page.getByRole('radio', { name: 'Email only' })).toBeDisabled();
      await expect
        .element(page.getByTestId(publishTypeError))
        .toHaveTextContent(EMAILS_LIMIT_MESSAGE);

      await publishScreen.continueButton().click();
      await publishScreen.confirmButton().click();

      await expect.poll(currentRoute).toBe('/posts');
      expect(saveApi.lastRequest?.url).not.toContain('newsletter=');
    });

    it('holds email with the host copy while the account is under review', async () => {
      publishChrome({ newsletters: 1 });
      fakeEmailsSent(100);
      fakeSavablePost();
      await renderAdminApp(
        `/editor/post/${POST_ID}`,
        onHostPlan({
          settings: { email_verification_required: true },
          hostSettings: { emailVerification: { emailSendingDisabledMessage: HOLD_MESSAGE } },
        }),
      );

      await openPublishFlow();
      await publishScreen.setting('publish-type').click();

      await expect.element(page.getByRole('radio', { name: 'Publish and email' })).toBeDisabled();
      await expect.element(page.getByRole('radio', { name: 'Email only' })).toBeDisabled();
      await expect.element(page.getByTestId(publishTypeError)).toHaveTextContent(HOLD_MESSAGE);
    });

    it('holds email with the default copy when the host supplies none', async () => {
      publishChrome({ newsletters: 1 });
      fakeEmailsSent(100);
      fakeSavablePost();
      await renderAdminApp(
        `/editor/post/${POST_ID}`,
        onHostPlan({ settings: { email_verification_required: true } }),
      );

      await openPublishFlow();
      await publishScreen.setting('publish-type').click();

      await expect
        .element(page.getByTestId(publishTypeError))
        .toHaveTextContent(
          'Email sending is temporarily disabled because your account is currently',
        );
    });
  });

  describe('improveSendingUI', () => {
    const SEND_ERROR = 'Mailgun rejected the batch.';
    const SENDING_UI_ON = { ...MAILGUN_ON, labs: { ...FLAG_ON.labs, improveSendingUI: true } };
    const SENDS = [
      {
        send: 'a publish that emails',
        emailOnly: false,
        status: 'published',
        failure: 'Your post has been published but the email failed to send.',
      },
      {
        send: 'an email-only send',
        emailOnly: true,
        status: 'sent',
        failure: 'Your post has been created but the email failed to send.',
      },
    ] as const;

    /**
     * The flow's email confirmation read, finding the send failed. Registered
     * after the post's own fake, so it answers that read and no other.
     */
    function failSendOnConfirmation(status: 'published' | 'sent') {
      return fakeAdminEndpoint('GET', new RegExp(`^/posts/${POST_ID}/\\?include=email$`), {
        posts: [
          {
            id: POST_ID,
            status,
            email: {
              id: 'email-1',
              status: 'failed',
              error: SEND_ERROR,
              email_count: 20,
              opened_count: 0,
            },
          },
        ],
      });
    }

    async function sendThroughFlow(emailOnly: boolean) {
      await expect.element(editorScreen.publishButton()).toBeEnabled();
      await editorScreen.publishButton().click();
      if (emailOnly) {
        await publishScreen.setting('publish-type').click();
        await page.getByLabelText('Email only').click();
      }
      await publishScreen.continueButton().click();
      await publishScreen.confirmButton().click();
    }

    it.each(SENDS)('hands $send to post analytics once it saves', async ({ emailOnly, status }) => {
      publishChrome({ newsletters: 1 });
      fakeSavablePost();
      const confirmationApi = failSendOnConfirmation(status);
      await renderAdminApp(`/editor/post/${POST_ID}`, SENDING_UI_ON);

      await sendThroughFlow(emailOnly);

      await expect.poll(currentRoute).toBe(`/posts/analytics/${POST_ID}`);
      await expect(editorScreen.root()).toHaveCount(0);
      expect(confirmationApi.requests).toHaveLength(0);
    });

    it.each(SENDS)(
      'waits on $send without the flag and reports its failure',
      async ({ emailOnly, status, failure }) => {
        publishChrome({ newsletters: 1 });
        fakeSavablePost();
        failSendOnConfirmation(status);
        await renderAdminApp(`/editor/post/${POST_ID}`, MAILGUN_ON);

        await sendThroughFlow(emailOnly);

        await expect.element(publishScreen.emailError()).toHaveTextContent(failure);
        await expect.element(publishScreen.emailError()).toHaveTextContent(SEND_ERROR);
        await expect.poll(currentRoute).toBe(`/editor/post/${POST_ID}`);
      },
    );

    it('shows the send under way when the writer returns to the editor', async () => {
      publishChrome({ newsletters: 1 });
      fakeSavablePost();
      await renderAdminApp(`/editor/post/${POST_ID}`, SENDING_UI_ON);

      await sendThroughFlow(false);
      await expect.poll(currentRoute).toBe(`/posts/analytics/${POST_ID}`);
      window.history.back();

      await expect
        .element(editorScreen.status())
        .toHaveTextContent('Published and sending to 20 members');
    });
  });
});
