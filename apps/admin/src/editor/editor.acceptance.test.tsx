import { describe, expect, it } from 'vitest';

import { fakeAdminEndpoint, fakeEditorChrome, post, renderAdminApp } from '@test-utils/acceptance';
import { editorScreen } from '@/editor/editor.screen';

const FLAG_ON = { labs: { editorReact: true } };
const FLAG_OFF = { labs: { editorReact: false } };

/**
 * `EmberRoot` reparents the `#ember-app` stand-in out of `body` into its own
 * wrapper and leaves that wrapper `hidden` until a route registers an Ember
 * fallback, so both conditions have to hold — the stand-in is still parented to
 * `body` on a React route.
 */
function emberShellShown(): boolean {
  const app = document.getElementById('ember-app');
  const emberRoot = app?.parentElement;
  if (!app || !emberRoot || emberRoot === document.body) {
    return false;
  }
  return !emberRoot.hidden && app.checkVisibility();
}

/**
 * The editor route mounts only when its feature flag is enabled. Disabled and
 * missing flags leave it unmounted.
 */
describe('Editor flag', () => {
  function fakeEditorWorld() {
    fakeEditorChrome();
    fakeAdminEndpoint('GET', /^\/posts\/abc123\/\?/, { posts: [post({ id: 'abc123' })] });
    fakeAdminEndpoint('GET', /^\/pages\/abc123\/\?/, { pages: [post({ id: 'abc123' })] });
  }

  it('renders the React editor when the flag is on', async () => {
    fakeEditorWorld();
    await renderAdminApp('/editor/post/abc123', FLAG_ON);

    await expect.element(editorScreen.root()).toBeVisible();
    await expect.element(editorScreen.backLink('post')).toHaveAttribute('href', '#/posts');
  });

  it('serves a new-post URL too', async () => {
    fakeEditorWorld();
    await renderAdminApp('/editor/post', FLAG_ON);

    await expect.element(editorScreen.root()).toBeVisible();
  });

  it('returns page editors to the pages list', async () => {
    fakeEditorWorld();
    await renderAdminApp('/editor/page/abc123', FLAG_ON);

    await expect.element(editorScreen.root()).toBeVisible();
    await expect.element(editorScreen.backLink('page')).toHaveAttribute('href', '#/pages');
  });

  it('leaves the editor route to Ember when the flag is off', async () => {
    fakeEditorChrome();
    await renderAdminApp('/editor/post/abc123', FLAG_OFF);

    await expect.poll(emberShellShown).toBe(true);
    await expect(editorScreen.root()).toHaveCount(0);
  });

  it('leaves the editor route to Ember when the flag is absent', async () => {
    fakeEditorChrome();
    await renderAdminApp('/editor/post/abc123');

    await expect.poll(emberShellShown).toBe(true);
    await expect(editorScreen.root()).toHaveCount(0);
  });
});
