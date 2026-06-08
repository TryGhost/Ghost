import {CustomViewModal, PostsPage, SidebarPage} from '@/admin-pages';
import {TagFactory, createTagFactory} from '@/data-factory';
import {expect, test} from '@/helpers/playwright/fixture';

test.describe('Ghost Admin - Custom View Filters', () => {
    let tagFactory: TagFactory;

    test.beforeEach(async ({page}) => {
        tagFactory = createTagFactory(page.request);
    });

    test.describe('filter modifications', () => {
        test('modifying filters then clicking view again - resets to saved filters', async ({page}) => {
            await tagFactory.create({name: 'Reset'});
            const postsPage = new PostsPage(page);
            const sidebar = new SidebarPage(page);
            const modal = new CustomViewModal(page);

            await postsPage.goto();
            await postsPage.selectType('Draft posts');
            await postsPage.selectTag('Reset');

            await postsPage.openSaveViewModal();
            await modal.waitForModal();
            await modal.enterName('Reset Test');
            await modal.save();

            await postsPage.selectType('Published posts');

            await expect(page).toHaveURL(/type=published/);

            await sidebar.getNavLink('Reset Test').click();

            await expect(page).toHaveURL(/type=draft/);
            await expect(page).not.toHaveURL(/type=published/);
        });

        test('changing filters to match different view - switches active state', async ({page}) => {
            await tagFactory.create({name: 'ViewA'});
            await tagFactory.create({name: 'ViewB'});
            const postsPage = new PostsPage(page);
            const sidebar = new SidebarPage(page);
            const modal = new CustomViewModal(page);

            await postsPage.goto();
            await postsPage.selectType('Draft posts');
            await postsPage.selectTag('ViewA');

            await postsPage.openSaveViewModal();
            await modal.waitForModal();
            await modal.enterName('View A');
            await modal.save();

            await sidebar.getNavLink('Posts').click();
            await sidebar.getNavLink('Posts').click();
            await postsPage.selectType('Published posts');
            await postsPage.selectTag('ViewB');

            await postsPage.openSaveViewModal();
            await modal.waitForModal();
            await modal.enterName('View B');
            await modal.save();

            await sidebar.getNavLink('View A').click();

            await expect(sidebar.getNavLink('View A')).toHaveAttribute('aria-current', 'page');

            await postsPage.selectType('Published posts');
            await postsPage.selectTag('ViewB');

            await expect(sidebar.getNavLink('View B')).toHaveAttribute('aria-current', 'page');
            await expect(sidebar.getNavLink('View A')).not.toHaveAttribute('aria-current', 'page');
        });
    });

    test.describe('persistence', () => {
        test('custom views persist after page reload', async ({page}) => {
            await tagFactory.create({name: 'Persist'});
            const postsPage = new PostsPage(page);
            const sidebar = new SidebarPage(page);
            const modal = new CustomViewModal(page);

            await postsPage.goto();
            await postsPage.selectType('Scheduled posts');
            await postsPage.selectTag('Persist');

            await postsPage.openSaveViewModal();
            await modal.waitForModal();
            await modal.enterName('Persist Test');
            await modal.save();

            await page.reload();

            await expect(sidebar.getNavLink('Persist Test')).toBeVisible();
        });

        test('custom view filters persist after page reload', async ({page}) => {
            const tag = await tagFactory.create({name: 'FilterPersist'});
            const postsPage = new PostsPage(page);
            const sidebar = new SidebarPage(page);
            const modal = new CustomViewModal(page);

            await postsPage.goto();
            await postsPage.selectType('Published posts');
            await postsPage.selectTag('FilterPersist');

            await postsPage.openSaveViewModal();
            await modal.waitForModal();
            await modal.enterName('Filter Persist');
            await modal.save();

            await page.reload();

            await expect(page).toHaveURL(/type=published/);
            await expect(page).toHaveURL(new RegExp(`tag=${tag.slug}`));
            await expect(sidebar.getNavLink('Filter Persist')).toHaveAttribute('aria-current', 'page');
        });
    });
});
