import { PostEditorPage, PostsPage } from '@/admin-pages';
import { expect, test } from '@/helpers/playwright';

test.describe('Ghost Admin - Editor session expiry', () => {
  test('save recovers through re-authentication after the session expires', async ({
    page,
    ghostAccountOwner,
  }) => {
    // Draft creation, expiry, re-authentication and a second autosave do not
    // fit the default local budget
    test.setTimeout(60000);

    const postData = {
      title: `session-expiry-${Date.now()}`,
      body: 'Written before the session expired.',
    };

    const postsPage = new PostsPage(page);
    await postsPage.goto();
    await postsPage.newPostButton.click();

    const editor = new PostEditorPage(page);
    await editor.createDraft(postData);
    // The draft autosave assigns the post an id and moves the URL onto it
    const postId = await editor.getPostId();

    // Typing the draft can leave content unsaved with no autosave pending
    // (performs during the in-flight create are dropped) or with a debounced
    // autosave still to come. Flush deterministically before expiring the
    // session - type a marker and wait for the save that carries it - so the
    // 401 comes from the post-expiry typing below, not a stale autosave
    const flushMarker = 'Flushed before expiry.';
    await Promise.all([
      page.waitForResponse(
        (response) =>
          response.request().method() === 'PUT' &&
          response.url().includes(`/ghost/api/admin/posts/${postId}/`) &&
          response.status() === 200 &&
          (response.request().postData() ?? '').includes(flushMarker),
      ),
      editor.appendToBody(` ${flushMarker}`),
    ]);

    // Expire the session server-side while the editor stays open
    const logoutResponse = await page.request.delete('/ghost/api/admin/session/');
    expect(logoutResponse.ok()).toBeTruthy();

    // Typing more triggers the draft autosave, which now fails authentication
    await editor.appendToBody(' Written after the session expired.');

    // The editor must not redirect away and lose content; it keeps the post
    // on screen and asks for the password instead
    await expect(editor.reauthenticateModal.modal).toBeVisible({ timeout: 15000 });
    expect(page.url()).toContain(`/editor/post/${postId}`);
    await expect(editor.lexicalEditor).toContainText('Written after the session expired.');

    // Re-authenticating closes the modal and restores the session
    await editor.reauthenticateModal.signIn(ghostAccountOwner.password);
    await expect(editor.reauthenticateModal.modal).toBeHidden();

    // Saving works again: the next edit autosaves successfully
    const [saveResponse] = await Promise.all([
      page.waitForResponse(
        (response) =>
          response.request().method() === 'PUT' &&
          response.url().includes(`/ghost/api/admin/posts/${postId}/`) &&
          response.status() === 200,
      ),
      editor.appendToBody(' Written after re-authenticating.'),
    ]);
    expect(saveResponse.status()).toBe(200);

    // Nothing typed across the expiry was lost
    const postResponse = await page.request.get(
      `/ghost/api/admin/posts/${postId}/?formats=lexical`,
    );
    expect(postResponse.status()).toBe(200);
    const {
      posts: [post],
    } = await postResponse.json();
    expect(post.status).toBe('draft');
    expect(post.lexical).toContain('Written before the session expired.');
    expect(post.lexical).toContain('Written after the session expired.');
    expect(post.lexical).toContain('Written after re-authenticating.');
  });
});
