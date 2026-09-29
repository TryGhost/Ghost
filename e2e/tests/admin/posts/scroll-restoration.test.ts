import { PostEditorPage, PostsPage } from '@/admin-pages';
import { createPostFactory } from '@/data-factory';
import { expect, test } from '@/helpers/playwright';
import { post } from '@tryghost/test-data';
import { postListItemLink } from '@tryghost/test-data/selectors/posts';

for (const editorReact of [false, true]) {
  test.describe(`Posts scroll restoration (${editorReact ? 'React' : 'Ember'} editor)`, () => {
    test.use({ labs: { postsListReact: true, editorReact } });

    for (const returnWith of ['back', 'breadcrumb']) {
      test(`restores loaded rows and scroll using ${returnWith}`, async ({ page }) => {
        const target = await createPostFactory(page.request).create({
          title: 'Scroll target',
          status: 'draft',
        });
        const posts = Array.from({ length: 90 }, (_, index) =>
          post({
            id: index === 45 ? target.id : (index + 1).toString(16).padStart(24, '0'),
            title: index === 45 ? target.title : `Draft ${index}`,
            status: 'draft',
          }),
        );
        await page.route('**/ghost/api/admin/posts/**', async (route) => {
          const url = new URL(route.request().url());
          if (!url.pathname.endsWith('/posts/')) {
            await route.continue();
            return;
          }
          const entries = url.searchParams.get('filter')?.includes('status:draft') ? posts : [];
          const limit = Number(url.searchParams.get('limit') || '30');
          const currentPage = Number(url.searchParams.get('page') || '1');
          const pages = Math.ceil(entries.length / limit);
          await route.fulfill({
            contentType: 'application/json',
            body: JSON.stringify({
              posts: entries.slice((currentPage - 1) * limit, currentPage * limit),
              meta: {
                pagination: {
                  page: currentPage,
                  limit,
                  pages,
                  total: entries.length,
                  next: currentPage < pages ? currentPage + 1 : null,
                  prev: currentPage > 1 ? currentPage - 1 : null,
                },
              },
            }),
          });
        });

        const postsPage = new PostsPage(page, { implementation: 'react' });
        const editor = new PostEditorPage(page, {
          implementation: editorReact ? 'react' : 'ember',
        });
        const listUrl = '/ghost/#/posts?type=draft&order=title+asc';
        await page.goto(listUrl);
        await expect(postsPage.postsListItem).toHaveCount(30);
        await page.getByRole('button', { name: 'Load more', exact: true }).click();
        await expect(postsPage.postsListItem).toHaveCount(60);
        const row = postsPage.getPostByTitle(target.title);
        await row.scrollIntoViewIfNeeded();
        const scrollTop = await postsPage.getScrollParentScrollTop();
        expect(scrollTop).toBeGreaterThan(1000);
        await row.getByTestId(postListItemLink).click();
        await expect(editor.titleInput).toBeVisible();

        if (returnWith === 'back') {
          await page.goBack();
        } else {
          await editor.backButton.click();
        }

        await expect(page).toHaveURL(/\/ghost\/#\/posts\?type=draft&order=title(?:%20|\+)asc$/);
        await expect(postsPage.postsListItem).toHaveCount(60);
        await expect
          .poll(async () => Math.abs((await postsPage.getScrollParentScrollTop()) - scrollTop))
          .toBeLessThan(50);

        await page
          .getByTestId('admin-sidebar')
          .getByRole('link', { name: 'Posts', exact: true })
          .click();
        await expect(page).toHaveURL('/ghost/#/posts');
        await expect.poll(() => postsPage.getScrollParentScrollTop()).toBe(0);
      });
    }
  });
}
