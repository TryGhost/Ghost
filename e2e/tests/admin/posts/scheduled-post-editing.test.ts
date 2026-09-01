import { Page } from '@playwright/test';
import { PostEditorPage, PostsPage } from '@/admin-pages';
import { createPostFactory } from '@/data-factory';
import { expect, test } from '@/helpers/playwright';

// Server-side: config times.cannotScheduleAPostBeforeInMinutes (default 2),
// enforced only when published_at changes.
const MIN_SCHEDULE_LEAD_MS = 2 * 60 * 1000;

async function getPost(page: Page, postId: string) {
  const response = await page.request.get(`/ghost/api/admin/posts/${postId}/?formats=lexical`);
  expect(response.status()).toBe(200);
  const { posts } = await response.json();
  return posts[0];
}

function waitForPostSave(page: Page, postId: string) {
  return page.waitForResponse(
    (response) =>
      response.request().method() === 'PUT' &&
      response.url().includes(`/ghost/api/admin/posts/${postId}/`) &&
      response.status() === 200,
  );
}

test.describe('Ghost Admin - Scheduled post editing', () => {
  test('keeps the schedule and publish time when content is edited', async ({ page }) => {
    // Scheduling via the publish flow plus a reopen of the post does not fit
    // the default local budget
    test.setTimeout(60000);

    // ~25h out: always beyond the minimum lead time, and always on a
    // different calendar day than the picker default (now + 10 minutes) so
    // filling the date input observably changes the schedule summary
    const target = new Date(Date.now() + 25 * 60 * 60 * 1000);
    const isoTarget = target.toISOString();
    const scheduleDate = isoTarget.slice(0, 10);
    const scheduleTime = isoTarget.slice(11, 16);

    const postsPage = new PostsPage(page);
    await postsPage.goto();
    await postsPage.newPostButton.click();

    const editor = new PostEditorPage(page);
    await editor.createDraft({
      title: `scheduled-edit-${Date.now()}`,
      body: 'Scheduled post body.',
    });
    // The draft autosave assigns the post an id and moves the URL onto it
    const postId = await editor.getPostId();

    await editor.publishFlow.open();
    await editor.publishFlow.schedule({ date: scheduleDate, time: scheduleTime });
    await Promise.all([waitForPostSave(page, postId), editor.publishFlow.confirm()]);

    // Completing the publish flow navigates to the posts list with a success
    // modal, so editing means closing it and reopening the post
    await editor.publishFlow.close();
    await editor.gotoPost(postId);

    await expect(editor.postStatus.first()).toContainText('Scheduled');

    // A schedule set through the picker round-trips without validation
    // errors: the editor zeroes milliseconds before saving (the API only
    // stores whole seconds), so re-saves send back an identical published_at
    // and cannot trip date-changed validation. Seconds are not zeroed - they
    // are inherited from the moment scheduling was toggled - so pin the
    // picked minute and the zeroed milliseconds only
    const scheduled = await getPost(page, postId);
    expect(scheduled.status).toBe('scheduled');
    expect(scheduled.published_at).toMatch(
      new RegExp(`^${scheduleDate}T${scheduleTime}:\\d{2}\\.000Z$`),
    );

    await editor.appendToBody(' Edited while scheduled.');
    await Promise.all([waitForPostSave(page, postId), editor.publishSaveButton.click()]);

    await expect(editor.postStatus.first()).toContainText('Scheduled');
    const updated = await getPost(page, postId);
    expect(updated.status).toBe('scheduled');
    expect(updated.published_at).toBe(scheduled.published_at);
    expect(updated.lexical).toContain('Edited while scheduled.');
  });

  test('saves edits and unschedules close to the publish time', async ({ page }) => {
    // Waiting into the minimum-lead window takes real clock time
    test.setTimeout(120000);

    const postFactory = createPostFactory(page.request);
    // Far enough out to pass creation validation, close enough that the wait
    // into the minimum-lead window stays short. Whole seconds only: the API
    // stores second precision
    const publishAt = new Date(Math.ceil(Date.now() / 1000) * 1000 + 150 * 1000);
    const post = await postFactory.create({
      title: `near-publish-edit-${Date.now()}`,
      status: 'scheduled',
      published_at: publishAt,
    });

    const editor = new PostEditorPage(page);
    await editor.gotoPost(post.id);
    await expect(editor.postStatus.first()).toContainText('Scheduled');

    // Enter the window in which a *changed* publish time would be rejected
    await expect
      .poll(() => Date.now(), { timeout: 60000 })
      .toBeGreaterThan(publishAt.getTime() - MIN_SCHEDULE_LEAD_MS);

    await editor.appendToBody(' Last minute edit.');
    // Re-saving with an unchanged publish time succeeds inside the window:
    // the minimum lead is enforced only when published_at changes
    await Promise.all([waitForPostSave(page, post.id), editor.publishSaveButton.click()]);

    const updated = await getPost(page, post.id);
    expect(updated.status).toBe('scheduled');
    expect(updated.published_at).toBe(publishAt.toISOString());
    expect(updated.lexical).toContain('Last minute edit.');

    // Unscheduling still works this close to the publish time
    await editor.revertToDraft();
    await expect(editor.postStatus.first()).toContainText('Draft');
    const reverted = await getPost(page, post.id);
    expect(reverted.status).toBe('draft');
  });
});
