import { beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { buildLexicalParagraph } from '@tryghost/test-data';

import {
  currentRoute,
  currentUserResponse,
  fakeAdminEndpoint,
  fakeEditorChrome,
  plainText,
  post,
  renderAdminApp,
  submittedPost,
  unsavedChangesGuarded,
  withFastAutosave,
  withoutAutosave,
  type EndpointCapture,
  type Post,
} from '@test-utils/acceptance';
import { alertsScreen } from '@/alerts/alerts.screen';
import { reloadAdmin } from '@/auth/reload';
import { editorScreen } from '@/editor/editor.screen';

vi.mock('@/auth/reload', () => ({ reloadAdmin: vi.fn() }));

const POST_ID = 'abc123';
const FLAG_ON = withFastAutosave({ labs: { editorReact: true } });
const LOADED_AT = '2026-01-01T00:00:00.000Z';
const SAVED_AT = '2026-01-01T00:00:01.000Z';
const POST_ROUTE = new RegExp(`^/posts/${POST_ID}/\\?`);
const PASSWORD = 'hunter22';
const EMAIL = String(currentUserResponse().users[0].email);

const SESSION_GONE = {
  errors: [{ type: 'UnauthorizedError', message: 'Authorization failed' }],
};
const NO_SESSION = {
  errors: [{ type: 'NoPermissionError', message: 'Authorization failed' }],
};
const PASSWORD_INCORRECT = {
  errors: [
    { code: 'PASSWORD_INCORRECT', type: 'ValidationError', message: 'Your password is incorrect.' },
  ],
};
const CODE_REQUIRED = {
  errors: [
    { code: '2FA_TOKEN_REQUIRED', type: 'Needs2FAError', message: 'User must verify session.' },
  ],
};
const TOO_MANY_ATTEMPTS = {
  errors: [{ type: 'TooManyRequestsError', message: 'Too many attempts.' }],
};
const TEXT_REPLY = { contentType: 'text/plain; charset=utf-8' };
// A notice shown on every screen, whose close is a request the editor does not make.
const SERVER_NOTICE = {
  id: 'update-notice',
  type: 'info',
  status: 'alert',
  message: 'A new version of Ghost is available.',
  custom: true,
  dismissible: true,
  location: 'top',
};

function loadedPost(): Post {
  return post({
    id: POST_ID,
    title: 'Hello from React',
    slug: 'hello-from-react',
    status: 'draft',
    lexical: buildLexicalParagraph('Hello from React'),
    updated_at: LOADED_AT,
    tags: [],
  });
}

/** A post whose every save finds the session gone. */
function fakeExpiredPost(): EndpointCapture {
  fakeEditorChrome();
  fakeAdminEndpoint('GET', POST_ROUTE, { posts: [loadedPost()] });
  return fakeAdminEndpoint('PUT', POST_ROUTE, SESSION_GONE, { status: 401 });
}

/** Saves answer again: declared after the expired fake, so it takes over from it. */
function restoreSaves(): EndpointCapture {
  return fakeAdminEndpoint('PUT', POST_ROUTE, ({ body }) => ({
    posts: [
      { ...loadedPost(), ...(body as { posts: Partial<Post>[] }).posts[0], updated_at: SAVED_AT },
    ],
  }));
}

function submittedBody(capture: EndpointCapture): string {
  const lexical = submittedPost(capture).lexical;
  return typeof lexical === 'string' ? lexical : '';
}

async function appendToBody(text: string) {
  const body = editorScreen.body();
  // One input event: a fast autosave must not split a keyboard sequence into several saves.
  await body.fill(`${body.element().textContent ?? ''}${text}`);
}

/** Edits until the save fails and the dialog asks for the password. */
async function expireDuringEdit() {
  await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);
  await expect.element(editorScreen.body()).toHaveTextContent('Hello from React');
  await appendToBody(' and more');
  await expect.element(editorScreen.reauthDialog()).toHaveTextContent('Are you still here?');
}

async function signIn(password: string) {
  await editorScreen.reauthPassword().fill(password);
  await editorScreen.reauthSignIn().click();
}

/** Expires the session on a site that asks for an emailed code, through to the code step. */
async function reachCodeStep() {
  fakeExpiredPost();
  fakeAdminEndpoint('POST', '/session/', CODE_REQUIRED, { status: 403 });
  await expireDuringEdit();
  await signIn(PASSWORD);
  await expect.element(editorScreen.reauthCode()).toBeVisible();
}

/** The `beforeunload` events a real navigation fires; the app's own guard probes are untrusted. */
function recordLeavingThePage(): Event[] {
  const fired: Event[] = [];
  const record = (event: Event) => {
    if (event.isTrusted) {
      fired.push(event);
    }
  };
  window.addEventListener('beforeunload', record);
  onTestFinished(() => window.removeEventListener('beforeunload', record));
  return fired;
}

/** Lets React render what a fired timer scheduled. */
async function nextFrame() {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

// Nothing leaves the page: the content stays and the held save goes out once the session is back.
describe('Post editor session expiry', () => {
  it('asks for the password in place when a save finds no session', async () => {
    const saveApi = fakeExpiredPost();

    await expireDuringEdit();

    await expect.element(editorScreen.reauthEmail()).toHaveValue(EMAIL);
    await expect.poll(() => document.activeElement?.id).toBe('reauth-password');
    await expect
      .element(editorScreen.bodyBehindDialog())
      .toHaveTextContent('Hello from React and more');
    expect(currentRoute()).toBe(`/editor/post/${POST_ID}`);
    expect(saveApi.requests).toHaveLength(1);
  });

  it('sends the held save once the password is accepted', async () => {
    fakeExpiredPost();
    const sessionApi = fakeAdminEndpoint('POST', '/session/', () => 'Created', { status: 201 });
    await expireDuringEdit();

    const restoredApi = restoreSaves();
    await signIn(PASSWORD);

    await expect(editorScreen.reauthDialog()).toHaveCount(0);
    expect(sessionApi.lastRequest?.body).toEqual({ username: EMAIL, password: PASSWORD });
    await expect.poll(() => restoredApi.requests.length).toBe(1);
    expect(submittedBody(restoredApi)).toContain('Hello from React and more');
    await expect.element(editorScreen.status()).toHaveTextContent('Saved');
  });

  it('names a wrong password and keeps asking', async () => {
    const saveApi = fakeExpiredPost();
    fakeAdminEndpoint('POST', '/session/', PASSWORD_INCORRECT, { status: 422 });
    await expireDuringEdit();

    await signIn('nope');

    await expect
      .element(editorScreen.reauthError())
      .toHaveTextContent('Your password is incorrect.');
    await expect.element(editorScreen.reauthDialog()).toBeVisible();
    await expect
      .element(editorScreen.bodyBehindDialog())
      .toHaveTextContent('Hello from React and more');
    expect(saveApi.requests).toHaveLength(1);
  });

  it('asks for the emailed code when the site requires one, then sends the held save', async () => {
    fakeExpiredPost();
    fakeAdminEndpoint('POST', '/session/', CODE_REQUIRED, { status: 403 });
    fakeAdminEndpoint('PUT', '/session/verify/', SESSION_GONE, { status: 401 });
    await expireDuringEdit();

    await signIn(PASSWORD);
    await expect.element(editorScreen.reauthDialog()).toHaveTextContent('2FA confirmation');

    await editorScreen.reauthCode().fill('000000');
    await editorScreen.reauthVerify().click();
    await expect
      .element(editorScreen.reauthError())
      .toHaveTextContent('Your verification code is incorrect.');

    const verifyApi = fakeAdminEndpoint('PUT', '/session/verify/', () => 'OK');
    const restoredApi = restoreSaves();
    await editorScreen.reauthCode().fill('123456');
    await editorScreen.reauthVerify().click();

    await expect(editorScreen.reauthDialog()).toHaveCount(0);
    expect(verifyApi.lastRequest?.body).toEqual({ token: '123456' });
    await expect.poll(() => restoredApi.requests.length).toBe(1);
    expect(submittedBody(restoredApi)).toContain('Hello from React and more');
  });

  it('emails a fresh code from the code step and confirms it', async () => {
    const resendApi = fakeAdminEndpoint('POST', '/session/verify/', plainText('OK'), TEXT_REPLY);
    await reachCodeStep();

    await editorScreen.reauthResend().click();

    await expect.element(editorScreen.codeSentToast()).toBeVisible();
    await expect.element(editorScreen.reauthResend('Sent')).toBeDisabled();
    expect(resendApi.requests).toHaveLength(1);
  });

  it('holds Resend for fifteen seconds once a code is sent', async () => {
    const resendApi = fakeAdminEndpoint('POST', '/session/verify/', plainText('OK'), TEXT_REPLY);
    await reachCodeStep();

    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    try {
      await editorScreen.reauthResend().click();
      await expect.element(editorScreen.reauthResend('Sent')).toBeDisabled();

      // Each retry of a polled assertion advances fake timers, so stop short of the boundary.
      vi.advanceTimersByTime(14_000);
      await nextFrame();
      await expect.element(editorScreen.reauthResend('Sent')).toBeDisabled();

      vi.advanceTimersByTime(1_000);
    } finally {
      vi.useRealTimers();
    }
    // Real timers drop any fake timer still pending, so a longer hold can't pass here.
    await expect.element(editorScreen.reauthResend()).toBeEnabled();

    await editorScreen.reauthResend().click();
    await expect.poll(() => resendApi.requests.length).toBe(2);
  });

  it('names a resend that failed and offers it again', async () => {
    fakeAdminEndpoint('POST', '/session/verify/', TOO_MANY_ATTEMPTS, { status: 429 });
    await reachCodeStep();

    await editorScreen.reauthResend().click();

    await expect.element(editorScreen.reauthError()).toHaveTextContent('Too many attempts.');
    await expect.element(editorScreen.reauthResend()).toBeEnabled();
  });

  it('keeps the draft dirty behind a banner after the dialog is cancelled', async () => {
    const saveApi = fakeExpiredPost();
    await expireDuringEdit();

    await editorScreen.cancelReauth().click();

    await expect(editorScreen.reauthDialog()).toHaveCount(0);
    await expect.element(editorScreen.saveErrorBanner()).toHaveTextContent('session expired');
    await expect.element(editorScreen.body()).toHaveTextContent('Hello from React and more');
    expect(saveApi.requests).toHaveLength(1);

    // The banner's retry is the way back in: the save fails again and the dialog returns.
    await editorScreen.retrySave().click();

    await expect.element(editorScreen.reauthDialog()).toHaveTextContent('Are you still here?');
    await expect.poll(() => saveApi.requests.length).toBe(2);
  });

  it('abandons the sign-in on Escape and falls back to the banner', async () => {
    const saveApi = fakeExpiredPost();
    await expireDuringEdit();

    await userEvent.keyboard('{Escape}');

    await expect(editorScreen.reauthDialog()).toHaveCount(0);
    await expect.element(editorScreen.saveErrorBanner()).toHaveTextContent('session expired');
    await expect.element(editorScreen.body()).toHaveTextContent('Hello from React and more');
    expect(saveApi.requests).toHaveLength(1);
  });

  it('stays on unsaved work when a request from elsewhere in Admin finds no session', async () => {
    fakeExpiredPost();
    const closeNotice = fakeAdminEndpoint('DELETE', /^\/notifications\//, SESSION_GONE, {
      status: 401,
    });
    await renderAdminApp(
      `/editor/post/${POST_ID}`,
      withoutAutosave({
        labs: { editorReact: true },
        boot: { browseNotifications: { response: { notifications: [SERVER_NOTICE] } } },
      }),
    );
    await expect.element(editorScreen.body()).toHaveTextContent('Hello from React');
    await appendToBody(' and more');
    await expect.poll(unsavedChangesGuarded).toBe(true);
    const leaving = recordLeavingThePage();

    await alertsScreen.closeButton(SERVER_NOTICE.message).click();
    await expect.poll(() => closeNotice.requests.length).toBe(1);
    await userEvent.keyboard('{Meta>}s{/Meta}');

    await expect.element(editorScreen.reauthDialog()).toHaveTextContent('Are you still here?');
    await expect
      .element(editorScreen.bodyBehindDialog())
      .toHaveTextContent('Hello from React and more');
    expect(leaving).toHaveLength(0);
    expect(currentRoute()).toBe(`/editor/post/${POST_ID}`);
  });

  it('does not leave the editor when the slug request finds no session', async () => {
    fakeEditorChrome();
    fakeAdminEndpoint('GET', POST_ROUTE, { posts: [loadedPost()] });
    fakeAdminEndpoint('GET', /^\/slugs\/post\//, SESSION_GONE, { status: 401 });
    const saveApi = fakeAdminEndpoint('PUT', POST_ROUTE, SESSION_GONE, { status: 401 });
    await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);

    await expect.element(editorScreen.body()).toHaveTextContent('Hello from React');
    await editorScreen.titleInput().fill('Brand New Name');
    await userEvent.tab();

    // The failing slug lookup must not navigate; the save the blur commits
    // is what tells the writer the session is gone.
    await expect.element(editorScreen.reauthDialog()).toBeVisible();
    expect(currentRoute()).toBe(`/editor/post/${POST_ID}`);
    expect(saveApi.requests.length).toBeGreaterThan(0);
  });
});

// Nothing is unsaved before the post opens, so it reloads into the signed-out admin.
describe('Opening a post after the session expired', () => {
  beforeEach(() => {
    vi.mocked(reloadAdmin).mockClear();
  });

  it.each([
    [401, SESSION_GONE],
    [403, NO_SESSION],
  ])('reloads onto the post when its first read is refused with %i', async (status, body) => {
    fakeEditorChrome();
    fakeAdminEndpoint('GET', POST_ROUTE, body, { status });
    await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);

    await expect
      .poll(() => vi.mocked(reloadAdmin).mock.calls)
      .toEqual([[`/editor/post/${POST_ID}`]]);
    await expect(editorScreen.loadError()).toHaveCount(0);
  });
});
