import { PostEditorPage, PostsPage } from '@/admin-pages';
import { PostFactory, createPostFactory } from '@/data-factory';
import { PostPage } from '@/helpers/pages';
import { SettingsService } from '@/helpers/services/settings/settings-service';
import { expect, test } from '@/helpers/playwright';
import { publishAtScheduleOption } from '@tryghost/test-data/selectors/editor';
import type { Page } from '@playwright/test';

/**
 * The Publish date section of the React post editor, behind the `editorReact`
 * Labs flag, on a site whose timezone is far from UTC. The writer edits in the
 * site's timezone; every assertion pins what the server, the site and the list
 * make of the instant that reaches them.
 */

const POSTS_API = '/ghost/api/admin/posts/';

const SITE_TIMEZONE = 'Pacific/Auckland';

// An early morning under New Zealand daylight time (UTC+13), so the UTC instant
// must fall on the previous calendar day
const LOCAL_DAY = '2026-03-10';
const LOCAL_TIME = '05:30';
const EXPECTED_INSTANT = '2026-03-09T16:30:00.000Z';
/** The theme's `DD MMM YYYY` and the list's short date, both in the site timezone. */
const LOCAL_DAY_LABEL = '10 Mar 2026';

/** The last minute of the site's day, still to come until the clock reaches it. */
const FUTURE_TIME = '23:59';

async function readPost(page: Page, postId: string) {
  const response = await page.request.get(`${POSTS_API}${postId}/`);
  expect(response.status()).toBe(200);
  const {
    posts: [post],
  } = await response.json();

  return post;
}

function waitForPostSave(page: Page, postId: string) {
  return page.waitForResponse(
    (response) =>
      response.request().method() === 'PUT' &&
      response.url().includes(`${POSTS_API}${postId}/`) &&
      response.status() === 200,
  );
}

/** Every PUT the editor sends for the post, recorded at dispatch time. */
function recordPostUpdates(page: Page, postId: string): string[] {
  const bodies: string[] = [];

  page.on('request', (request) => {
    if (request.method() === 'PUT' && request.url().includes(`${POSTS_API}${postId}/`)) {
      bodies.push(request.postData() ?? '');
    }
  });

  return bodies;
}

test.describe('Ghost Admin - Post editor publish date (React)', () => {
  // Flag state belongs on the describe — `test.use` inside a test body has no
  // effect on the fixtures that test already resolved.
  test.use({ labs: { editorReact: true } });

  let postFactory: PostFactory;
  let editor: PostEditorPage;

  test.beforeEach(async ({ page }) => {
    await new SettingsService(page.request).updateSettings([
      { key: 'timezone', value: SITE_TIMEZONE },
    ]);
    // Admin is already booted with the settings it loaded, so it edits in
    // the timezone it fetched: only a fresh boot picks the new one up
    await page.reload();
    postFactory = createPostFactory(page.request);
    editor = new PostEditorPage(page, { implementation: 'react' });
  });

  test('published - backdating in the site timezone stores the UTC instant and shows the local day', async ({
    page,
  }) => {
    const title = `react-backdate-${Date.now()}`;
    const created = await postFactory.create({ title, status: 'published' });

    await editor.gotoPost(created.id);
    await expect(editor.postStatus).toContainText('Published');

    const publishDate = editor.settings.publishDate;
    await publishDate.open();
    await publishDate.setDate(LOCAL_DAY);
    await publishDate.setTime(LOCAL_TIME);
    await expect(publishDate.dateInput).toHaveValue(LOCAL_DAY);
    await expect(publishDate.timeInput).toHaveValue(LOCAL_TIME);
    await expect(publishDate.error).toHaveCount(0);

    // A published post never autosaves, so Update is the only save
    await Promise.all([waitForPostSave(page, created.id), editor.publishSaveButton.click()]);

    const updated = await readPost(page, created.id);
    expect(updated.status).toBe('published');
    expect(updated.published_at).toBe(EXPECTED_INSTANT);

    const frontendPage = await page.context().newPage();
    await frontendPage.goto(`/${created.slug}/`);
    await expect(new PostPage(frontendPage).articleHeader).toContainText(LOCAL_DAY_LABEL);
    await frontendPage.close();

    const postsPage = new PostsPage(page);
    await postsPage.goto();
    await postsPage.waitForPageToFullyLoad();
    await expect(postsPage.getPostByTitle(title)).toContainText(LOCAL_DAY_LABEL);
  });

  test('draft - a time still to come is refused and a past one is saved', async ({ page }) => {
    const created = await postFactory.create({
      title: `react-draft-publish-date-${Date.now()}`,
      status: 'draft',
    });
    const updates = recordPostUpdates(page, created.id);

    await editor.gotoPost(created.id);
    await expect(editor.postStatus).toContainText('Draft');

    const publishDate = editor.settings.publishDate;
    await publishDate.open();
    await expect(publishDate.error).toHaveCount(0);

    // The field shows the current site-local day, so a late time on it is ahead
    await publishDate.setTime(FUTURE_TIME);
    await expect(publishDate.error).toBeVisible();
    const refusal = (await publishDate.error.textContent())?.trim() ?? '';
    expect(refusal).not.toBe('');

    // The section holds the field save back, and the explicit save is refused
    // with the same message before any request is sent
    await page.keyboard.press('ControlOrMeta+s');
    await expect(editor.header.saveErrorBanner).toBeVisible();
    await expect(editor.header.saveErrorBanner).toContainText(refusal);
    expect(updates).toHaveLength(0);
    expect((await readPost(page, created.id)).published_at).toBeNull();

    // A past day releases the held save; the time then saves on its own
    await Promise.all([waitForPostSave(page, created.id), publishDate.setDate(LOCAL_DAY)]);
    await Promise.all([waitForPostSave(page, created.id), publishDate.setTime(LOCAL_TIME)]);
    await expect(publishDate.error).toHaveCount(0);
    await expect(editor.header.saveErrorBanner).toHaveCount(0);

    const saved = await readPost(page, created.id);
    expect(saved.status).toBe('draft');
    expect(saved.published_at).toBe(EXPECTED_INSTANT);

    // A backdated draft is still scheduled from the publish flow, not from here
    await editor.publishFlow.open();
    await expect(editor.publishFlow.optionsStep).toBeVisible();
    await editor.publishFlow.publishAtButton.click();
    await expect(
      editor.publishFlow.optionsStep.getByRole('radio', {
        name: publishAtScheduleOption,
        exact: true,
      }),
    ).toBeVisible();
    await editor.publishFlow.close();
    await expect(editor.publishFlow.modal).toBeHidden();
  });
});
