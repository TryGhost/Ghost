import { MOCKED_SITE_URL, MockedApi, initialize, mockAdminAuthFrame } from '../utils/e2e';
import { buildMember } from '../utils/fixtures';
import { expect, test } from '@playwright/test';

test.describe('Copy link', async () => {
  test('copies a link to a comment from the menu', async ({ page, context, browserName }) => {
    // Only Chromium lets tests read the clipboard back
    if (browserName === 'chromium') {
      await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    }

    const mockedApi = new MockedApi({});
    mockedApi.setMember({});

    const commentId = '64a1b2c3d4e5f6a7b8c9d0e1';
    mockedApi.addComment({
      id: commentId,
      html: '<p>This is a test comment</p>',
      member: buildMember(),
    });

    const { frame } = await initialize({
      mockedApi,
      page,
      publication: 'Publisher Weekly',
    });

    const comment = frame.getByTestId('comment-component').nth(0);
    await comment.getByTestId('more-button').first().click();

    const copyLinkButton = frame.getByTestId('copy-link-button');
    await expect(copyLinkButton).toHaveText('Copy link');
    await copyLinkButton.click();

    await expect(copyLinkButton).toHaveText('Link copied');

    if (browserName === 'chromium') {
      const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
      expect(clipboardText).toEqual(`${MOCKED_SITE_URL}/#ghost-comments-${commentId}`);
    }

    // The menu closes itself shortly after copying
    await expect(frame.getByTestId('comment-context-menu')).toHaveCount(0);
  });

  test('does not show copy link for hidden comments', async ({ page }) => {
    const admin = MOCKED_SITE_URL + '/ghost/';
    await mockAdminAuthFrame({ page, admin });

    const mockedApi = new MockedApi({});
    mockedApi.setMember({ id: '1', uuid: '12345' });
    mockedApi.addComment({
      html: '<p>This is a hidden comment</p>',
      status: 'hidden',
    });

    const { frame } = await initialize({
      mockedApi,
      page,
      publication: 'Publisher Weekly',
      admin,
      labs: {},
    });

    const comment = frame.getByTestId('comment-component').nth(0);
    await comment.getByTestId('more-button').first().click();

    await expect(frame.getByTestId('show-button')).toBeVisible();
    await expect(frame.getByTestId('copy-link-button')).toHaveCount(0);
  });
});
