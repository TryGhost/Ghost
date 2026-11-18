import { afterEach, describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { buildLexicalParagraph } from '@tryghost/test-data';
import {
  fakeAdminEndpoint,
  fakeEditorChrome,
  fakeUsers,
  post,
  renderAdminApp,
  staffUser,
} from '@test-utils/acceptance';
import { editorScreen } from '@/editor/editor.screen';
import { deferred } from '@/utils/deferred';

const POST_ID = 'a'.repeat(24);
const OTHER_USER = 'b'.repeat(24);
const SECOND_USER = 'c'.repeat(24);
const INDICATORS_ON = { labs: { editorPresencePolling: true, editorPresence: true } };

function fakePresence(userIds = [OTHER_USER]) {
  return fakeAdminEndpoint('POST', '/presence/', () => ({
    presence: [
      {
        active: userIds.map((userId) => ({
          userId,
          resourceId: POST_ID,
          resourceType: 'post',
          ts: Date.now(),
        })),
        serverTime: Date.now(),
      },
    ],
  }));
}

/** Leaving the editor sends a leave with keepalive; the harness must answer it. */
function fakeLeave() {
  return fakeAdminEndpoint('POST', '/presence/leave/', () => new Response(null, { status: 204 }));
}

function fakePostRead(title: string, overrides: Partial<ReturnType<typeof post>> = {}) {
  fakeAdminEndpoint('GET', new RegExp(`^/posts/${POST_ID}/\\?`), {
    posts: [post({ id: POST_ID, title, ...overrides })],
  });
}

const originalClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard');

describe('Editor presence warnings', () => {
  afterEach(() => {
    if (originalClipboard) {
      Object.defineProperty(navigator, 'clipboard', originalClipboard);
    } else {
      delete (navigator as { clipboard?: unknown }).clipboard;
    }
  });

  it('centers compact presence in the toolbar and copies the writer’s content', async () => {
    fakeEditorChrome();
    fakePostRead('Presence example', {
      status: 'published',
      lexical: buildLexicalParagraph('Original body'),
      updated_at: '2026-01-01T00:00:00.000Z',
    });
    fakeLeave();
    fakeUsers([
      staffUser({ id: OTHER_USER, name: 'Iliana Mann', profile_image: null }),
      staffUser({ id: SECOND_USER, name: 'Zimo', profile_image: null }),
    ]);
    fakePresence([OTHER_USER, SECOND_USER]);
    const copied: string[] = [];
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: (text: string) => {
          copied.push(text);
          return Promise.resolve();
        },
      },
    });
    await renderAdminApp(`/editor/post/${POST_ID}`, INDICATORS_ON);
    const warning = page.getByRole('status', { name: 'Other editors' });
    await expect
      .element(warning)
      .toHaveTextContent(
        'Iliana Mann and Zimo also have this post open. Your changes may not save.',
      );
    const bounds = warning.element().getBoundingClientRect();
    expect(bounds.width).toBeLessThan(window.innerWidth - 32);
    expect(Math.abs(bounds.left + bounds.width / 2 - window.innerWidth / 2)).toBeLessThan(2);
    expect(bounds.top).toBeLessThan(30);
    expect(bounds.height).toBeLessThan(40);
    await expect(warning.getByRole('button', { name: 'Reload' })).toHaveCount(0);
    await editorScreen.body().fill('My unsaved body');
    await warning.getByRole('button', { name: 'Copy content' }).click();
    await expect.poll(() => copied).toEqual(['Presence example\n\nMy unsaved body']);
    await expect.element(page.getByText('Content copied', { exact: true })).toBeVisible();
  });

  it('keeps changes typed while a confirmed conflict reload is reading the server', async () => {
    fakeEditorChrome();
    fakePostRead('Presence example', {
      status: 'published',
      lexical: buildLexicalParagraph('Original body'),
      updated_at: '2026-01-01T00:00:00.000Z',
    });
    fakeLeave();
    fakeUsers([staffUser({ id: OTHER_USER, name: 'Alex Smith', profile_image: null })]);
    fakePresence();
    await renderAdminApp(`/editor/post/${POST_ID}`, INDICATORS_ON);
    const warning = page.getByRole('status', { name: 'Other editors' });
    await expect.element(warning).toBeVisible();
    await editorScreen.body().fill('My unsaved body');
    fakeAdminEndpoint(
      'PUT',
      new RegExp(`^/posts/${POST_ID}/\\?`),
      {
        errors: [
          { code: 'UPDATE_COLLISION', type: 'UpdateCollisionError', message: 'Post changed' },
        ],
      },
      { status: 409 },
    );
    await userEvent.keyboard('{Meta>}s{/Meta}');
    await expect.element(editorScreen.conflictBanner()).toBeVisible();
    const pending = deferred<{ posts: ReturnType<typeof post>[] }>();
    const reloadRead = fakeAdminEndpoint(
      'GET',
      new RegExp(`^/posts/${POST_ID}/\\?`),
      () => pending.promise,
    );
    await editorScreen.conflictBanner().getByRole('button', { name: 'Reload' }).click();
    await editorScreen.confirmConflictReload().click();
    await expect.poll(() => reloadRead.requests.length).toBe(1);
    await editorScreen.body().fill('Words typed during reload');
    pending.resolve({
      posts: [
        post({
          id: POST_ID,
          title: 'Latest saved title',
          status: 'published',
          lexical: buildLexicalParagraph('Their latest body'),
          updated_at: '2026-01-01T01:00:00.000Z',
        }),
      ],
    });
    await expect
      .element(page.getByText('Couldn’t reload this post', { exact: true }))
      .toBeVisible();
    await expect.element(editorScreen.body()).toHaveTextContent('Words typed during reload');
    await expect.element(editorScreen.titleInput()).toHaveValue('Presence example');
  });

  it('replaces the early warning with save-conflict recovery when an update is refused', async () => {
    fakeEditorChrome();
    fakePostRead('Presence example', {
      status: 'published',
      lexical: buildLexicalParagraph('Original body'),
      updated_at: '2026-01-01T00:00:00.000Z',
    });
    fakeLeave();
    fakeUsers([staffUser({ id: OTHER_USER, name: 'Alex Smith', profile_image: null })]);
    fakePresence();
    const saves = fakeAdminEndpoint(
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
    await renderAdminApp(`/editor/post/${POST_ID}`, INDICATORS_ON);
    await expect.element(page.getByRole('status', { name: 'Other editors' })).toBeVisible();
    await editorScreen.body().fill('My unsaved body');
    await userEvent.keyboard('{Meta>}s{/Meta}');
    await expect.poll(() => saves.requests.length).toBe(1);
    await expect
      .element(editorScreen.conflictBanner())
      .toHaveTextContent('Someone else saved changes. Your changes weren’t saved.');
    await expect(page.getByRole('status', { name: 'Other editors' })).toHaveCount(0);
    await expect.element(editorScreen.body()).toHaveTextContent('My unsaved body');
  });
});
