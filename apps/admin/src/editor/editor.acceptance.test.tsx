import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';

import { renderAdminApp } from '@test-utils/acceptance';

const FLAG_ON = { labs: { editorReact: true } };
const FLAG_OFF = { labs: { editorReact: false } };

/**
 * Proves the `editorReact` flag swap end-to-end in the real admin app: the
 * React placeholder appears only when the flag is on, and the Ember side of
 * the URL is delegated to otherwise.
 *
 * There is no Ember app in this harness, so "Ember serves it" shows up as the
 * React placeholder being absent rather than as an Ember editor being present
 * — the Ember half of the handshake (the lexical-editor route aborting its
 * transition) is covered in
 * apps/ember-admin/tests/acceptance/editor-react-flag-test.js.
 */
describe('Editor flag', () => {
  const placeholder = () => page.getByTestId('editor-react-placeholder');

  it('renders the React placeholder when the flag is on', async () => {
    await renderAdminApp('/editor/post/abc123', FLAG_ON);

    await expect.element(placeholder()).toBeVisible();
    await expect
      .element(page.getByRole('link', { name: 'Back to posts' }))
      .toHaveAttribute('href', '#/posts');
  });

  it('serves a new-post URL too', async () => {
    await renderAdminApp('/editor/post', FLAG_ON);

    await expect.element(placeholder()).toBeVisible();
  });

  it('returns page editors to the pages list', async () => {
    await renderAdminApp('/editor/page/abc123', FLAG_ON);

    await expect.element(placeholder()).toBeVisible();
    await expect
      .element(page.getByRole('link', { name: 'Back to pages' }))
      .toHaveAttribute('href', '#/pages');
  });

  it('defers to Ember when the flag is off', async () => {
    await renderAdminApp('/editor/post/abc123', FLAG_OFF);

    await expect(placeholder()).toHaveCount(0);
  });

  it('defers to Ember when the flag is absent entirely', async () => {
    await renderAdminApp('/editor/post/abc123');

    await expect(placeholder()).toHaveCount(0);
  });
});
