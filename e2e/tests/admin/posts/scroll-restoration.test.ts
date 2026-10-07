import { PostEditorPage, PostsPage } from '@/admin-pages';
import { createPostFactory } from '@/data-factory';
import { expect, test } from '@/helpers/playwright';
import { post } from '@tryghost/test-data';
import { postListItemLink, postsList, postsListItem } from '@tryghost/test-data/selectors/posts';

for (const editorReact of [false, true]) {
  test.describe(`Posts scroll restoration (${editorReact ? 'React' : 'Ember'} editor)`, () => {
    test.use({ labs: { editorReact } });

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

        const postsPage = new PostsPage(page);
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
        const rowTop = await row.evaluate((element) => element.getBoundingClientRect().top);
        expect(scrollTop).toBeGreaterThan(1000);
        await row.getByTestId(postListItemLink).click();
        await expect(editor.titleInput).toBeVisible();

        // Observe the first frame containing rows: polling only the final scroll
        // offset would miss a visible flash at the top before restoration.
        await page.evaluate(
          ({ listId, rowId, title }) => {
            const sample = () => {
              const rows = document.querySelectorAll(
                `[data-testid="${listId}"] [data-testid="${rowId}"]`,
              );
              const targetRow = Array.from(rows).find((element) =>
                element.textContent?.includes(title),
              );
              if (rows.length) {
                document.documentElement.dataset.firstPostReturnTop = String(
                  targetRow?.getBoundingClientRect().top ?? Infinity,
                );
                return;
              }
              requestAnimationFrame(sample);
            };
            requestAnimationFrame(sample);
          },
          { listId: postsList, rowId: postsListItem, title: target.title },
        );

        if (returnWith === 'back') {
          await page.goBack();
        } else {
          await editor.backButton.click();
        }

        await expect(page).toHaveURL(/\/ghost\/#\/posts\?type=draft&order=title(?:%20|\+)asc$/);
        await expect(postsPage.postsListItem).toHaveCount(60);
        await expect
          .poll(async () => {
            const firstTop = await page.evaluate(
              () => document.documentElement.dataset.firstPostReturnTop,
            );
            return Math.abs(Number(firstTop) - rowTop);
          })
          .toBeLessThan(50);
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
