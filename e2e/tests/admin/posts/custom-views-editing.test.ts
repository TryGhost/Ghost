import {CustomViewModal, PostsPage, SidebarPage} from '@/admin-pages';
import {TagFactory, createTagFactory} from '@/data-factory';
import {expect, test} from '@/helpers/playwright/fixture';

test.describe('Ghost Admin - Custom View Editing', () => {
    let tagFactory: TagFactory;

    test.beforeEach(async ({page}) => {
        tagFactory = createTagFactory(page.request);
    });

    test.describe('editing custom views', () => {
        test('renaming custom view - updates sidebar immediately', async ({page}) => {
            await tagFactory.create({name: 'Review'});
            const postsPage = new PostsPage(page);
            const sidebar = new SidebarPage(page);
            const modal = new CustomViewModal(page);

            await postsPage.goto();
            await postsPage.selectType('Draft posts');
            await postsPage.selectTag('Review');

            await postsPage.openSaveViewModal();
            await modal.waitForModal();
            await modal.enterName('Old Name');
            await modal.save();

            await postsPage.openEditViewModal();
            await modal.waitForModal();
            await modal.enterName('New Name');
            await modal.save();

            await expect(sidebar.getNavLink('New Name')).toBeVisible();
            await expect(sidebar.getNavLink('Old Name')).toBeHidden();
            await expect(sidebar.getNavLink('New Name')).toHaveAttribute('aria-current', 'page');
        });

        test('changing custom view color - updates sidebar indicator', async ({page}) => {
            const postsPage = new PostsPage(page);
            const sidebar = new SidebarPage(page);
            const modal = new CustomViewModal(page);

            await postsPage.goto();
            await postsPage.selectType('Published posts');
            await postsPage.selectVisibility('Members-only');

            await postsPage.openSaveViewModal();
            await modal.waitForModal();
            await modal.enterName('Color Test');
            await modal.selectColor('blue');
            await modal.save();

            await expect(sidebar.getCustomViewColorIndicator('Color Test')).toHaveAttribute('data-color', 'blue');

            await postsPage.openEditViewModal();
            await modal.waitForModal();
            await modal.selectColor('red');
            await modal.save();

            await expect(sidebar.getCustomViewColorIndicator('Color Test')).toHaveAttribute('data-color', 'red');
        });

        test('editing view while viewing it - maintains active state after save', async ({page}) => {
            await tagFactory.create({name: 'Scheduled'});
            const postsPage = new PostsPage(page);
            const sidebar = new SidebarPage(page);
            const modal = new CustomViewModal(page);

            await postsPage.goto();
            await postsPage.selectType('Scheduled posts');
            await postsPage.selectTag('Scheduled');

            await postsPage.openSaveViewModal();
            await modal.waitForModal();
            await modal.enterName('Active View');
            await modal.save();

            await postsPage.openEditViewModal();
            await modal.waitForModal();
            await modal.enterName('Renamed Active View');
            await modal.save();

            await expect(sidebar.getNavLink('Renamed Active View')).toHaveAttribute('aria-current', 'page');
        });
    });

    test.describe('deleting custom views', () => {
        test('deleting custom view - removes from sidebar', async ({page}) => {
            await tagFactory.create({name: 'Delete'});
            const postsPage = new PostsPage(page);
            const sidebar = new SidebarPage(page);
            const modal = new CustomViewModal(page);

            await postsPage.goto();
            await postsPage.selectType('Draft posts');
            await postsPage.selectTag('Delete');

            await postsPage.openSaveViewModal();
            await modal.waitForModal();
            await modal.enterName('To Delete');
            await modal.save();

            await postsPage.openEditViewModal();
            await modal.waitForModal();
            await modal.delete();

            await expect(sidebar.getNavLink('To Delete')).toBeHidden();
        });

        test('deleting active view - navigates to Posts page', async ({page}) => {
            await tagFactory.create({name: 'Active'});
            const postsPage = new PostsPage(page);
            const sidebar = new SidebarPage(page);
            const modal = new CustomViewModal(page);

            await postsPage.goto();
            await postsPage.selectType('Published posts');
            await postsPage.selectTag('Active');

            await postsPage.openSaveViewModal();
            await modal.waitForModal();
            await modal.enterName('Active Delete Test');
            await modal.save();

            await postsPage.openEditViewModal();
            await modal.waitForModal();
            await modal.delete();

            await expect(page).toHaveURL(/\/ghost\/#\/posts\/?$/);
            await expect(sidebar.getNavLink('Posts')).toHaveAttribute('aria-current', 'page');
        });

        test('deleting one of multiple views - others remain unchanged', async ({page}) => {
            await tagFactory.create({name: 'One'});
            await tagFactory.create({name: 'Two'});
            await tagFactory.create({name: 'Three'});
            const postsPage = new PostsPage(page);
            const sidebar = new SidebarPage(page);
            const modal = new CustomViewModal(page);

            await postsPage.goto();
            await postsPage.selectType('Draft posts');
            await postsPage.selectTag('One');

            await postsPage.openSaveViewModal();
            await modal.waitForModal();
            await modal.enterName('View 1');
            await modal.save();

            await sidebar.getNavLink('Posts').click();
            await postsPage.selectType('Scheduled posts');
            await postsPage.selectTag('Two');

            await postsPage.openSaveViewModal();
            await modal.waitForModal();
            await modal.enterName('View 2');
            await modal.save();

            await sidebar.getNavLink('Posts').click();
            await postsPage.selectType('Published posts');
            await postsPage.selectTag('Three');

            await postsPage.openSaveViewModal();
            await modal.waitForModal();
            await modal.enterName('View 3');
            await modal.save();

            await sidebar.getNavLink('View 2').click();

            await postsPage.openEditViewModal();
            await modal.waitForModal();
            await modal.delete();

            await expect(sidebar.getNavLink('View 1')).toBeVisible();
            await expect(sidebar.getNavLink('View 2')).toBeHidden();
            await expect(sidebar.getNavLink('View 3')).toBeVisible();
        });
    });
});
