import { describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { buildLexicalParagraph } from '@tryghost/test-data';

import {
  currentRoute,
  currentUserResponse,
  fakeAdminEndpoint,
  fakeEditorChrome,
  post,
  renderAdminApp,
  submittedPost,
  withFastAutosave,
  type EndpointCapture,
  type Post,
} from '@test-utils/acceptance';
import { editorScreen } from '@/editor/editor.screen';

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

  it('does not leave the editor when the slug request finds no session', async () => {
    fakeEditorChrome();
    fakeAdminEndpoint('GET', POST_ROUTE, { posts: [loadedPost()] });
    fakeAdminEndpoint('GET', /^\/slugs\/post\//, SESSION_GONE, { status: 401 });
    const saveApi = fakeAdminEndpoint('PUT', POST_ROUTE, SESSION_GONE, { status: 401 });
    await renderAdminApp(`/editor/post/${POST_ID}`, FLAG_ON);

    await expect.element(editorScreen.body()).toHaveTextContent('Hello from React');
    await editorScreen.titleInput().fill('Brand New Name');

    // The failing slug lookup must not navigate; the save that follows it
    // is what tells the writer the session is gone.
    await expect.element(editorScreen.reauthDialog()).toBeVisible();
    expect(currentRoute()).toBe(`/editor/post/${POST_ID}`);
    expect(saveApi.requests.length).toBeGreaterThan(0);
  });
});
