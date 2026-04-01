import {CustomViewModal, PostsPage, SidebarPage} from '@/admin-pages';
import {TagFactory, createTagFactory} from '@/data-factory';
import {expect, test} from '@/helpers/playwright/fixture';

test.describe('Ghost Admin - Custom Views', () => {
    let tagFactory: TagFactory;

    test.beforeEach(async ({page}) => {
        tagFactory = createTagFactory(page.request);
    });

    test('create a custom view with color and verify it appears in sidebar', async ({page}) => {
        await tagFactory.create({name: 'Featured'});
        const postsPage = new PostsPage(page);
        const sidebar = new SidebarPage(page);
        const modal = new CustomViewModal(page);

        await postsPage.goto();
        await postsPage.selectType('Draft posts');
        await postsPage.selectTag('Featured');

        await postsPage.openSaveViewModal();
        await modal.waitForModal();
        await modal.enterName('Featured Drafts');
        await modal.selectColor('green');
        await modal.save();

        // View appears in sidebar with correct name, color, and active state
        await expect(sidebar.getNavLink('Featured Drafts')).toBeVisible();
        await expect(sidebar.getNavLink('Featured Drafts')).toHaveAttribute('aria-current', 'page');
        await expect(sidebar.getCustomViewColorIndicator('Featured Drafts')).toHaveAttribute('data-color', 'green');

        // Navigate away and back — filters should be restored
        await sidebar.getNavLink('Posts').click();
        await expect(sidebar.getNavLink('Featured Drafts')).not.toHaveAttribute('aria-current', 'page');

        await sidebar.getNavLink('Featured Drafts').click();
        await expect(page).toHaveURL(/type=draft/);
        await expect(sidebar.getNavLink('Featured Drafts')).toHaveAttribute('aria-current', 'page');
    });

    test('navigate between multiple custom views and verify active state switches', async ({page}) => {
        await tagFactory.create({name: 'Tech'});
        await tagFactory.create({name: 'Business'});
        const postsPage = new PostsPage(page);
        const sidebar = new SidebarPage(page);
        const modal = new CustomViewModal(page);

        // Create first view
        await postsPage.goto();
        await postsPage.selectType('Draft posts');
        await postsPage.selectTag('Tech');

        await postsPage.openSaveViewModal();
        await modal.waitForModal();
        await modal.enterName('Tech Drafts');
        await modal.save();

        // Create second view
        await sidebar.getNavLink('Posts').click();
        await postsPage.selectType('Published posts');
        await postsPage.selectTag('Business');

        await postsPage.openSaveViewModal();
        await modal.waitForModal();
        await modal.enterName('Published Business');
        await modal.save();

        // Click first view — it becomes active, second deactivates
        await sidebar.getNavLink('Tech Drafts').click();
        await expect(sidebar.getNavLink('Tech Drafts')).toHaveAttribute('aria-current', 'page');
        await expect(sidebar.getNavLink('Published Business')).not.toHaveAttribute('aria-current', 'page');

        // Click second view — it becomes active, first deactivates
        await sidebar.getNavLink('Published Business').click();
        await expect(sidebar.getNavLink('Published Business')).toHaveAttribute('aria-current', 'page');
        await expect(sidebar.getNavLink('Tech Drafts')).not.toHaveAttribute('aria-current', 'page');

        // Click Posts — both deactivate
        await sidebar.getNavLink('Posts').click();
        await expect(sidebar.getNavLink('Posts')).toHaveAttribute('aria-current', 'page');
        await expect(sidebar.getNavLink('Tech Drafts')).not.toHaveAttribute('aria-current', 'page');
        await expect(sidebar.getNavLink('Published Business')).not.toHaveAttribute('aria-current', 'page');

        // Modify filters to match a different view — active state switches automatically
        await sidebar.getNavLink('Tech Drafts').click();
        await expect(sidebar.getNavLink('Tech Drafts')).toHaveAttribute('aria-current', 'page');

        await postsPage.selectType('Published posts');
        await postsPage.selectTag('Business');

        await expect(sidebar.getNavLink('Published Business')).toHaveAttribute('aria-current', 'page');
        await expect(sidebar.getNavLink('Tech Drafts')).not.toHaveAttribute('aria-current', 'page');
    });

    test('edit a custom view — rename and change color', async ({page}) => {
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
        await modal.selectColor('blue');
        await modal.save();

        // Rename the view
        await postsPage.openEditViewModal();
        await modal.waitForModal();
        await modal.enterName('New Name');
        await modal.save();

        await expect(sidebar.getNavLink('New Name')).toBeVisible();
        await expect(sidebar.getNavLink('Old Name')).toBeHidden();
        await expect(sidebar.getNavLink('New Name')).toHaveAttribute('aria-current', 'page');

        // Change the color
        await postsPage.openEditViewModal();
        await modal.waitForModal();
        await modal.selectColor('red');
        await modal.save();

        await expect(sidebar.getCustomViewColorIndicator('New Name')).toHaveAttribute('data-color', 'red');
        await expect(sidebar.getNavLink('New Name')).toHaveAttribute('aria-current', 'page');
    });

    test('delete custom views — others remain, deleting active view redirects to Posts', async ({page}) => {
        await tagFactory.create({name: 'One'});
        await tagFactory.create({name: 'Two'});
        await tagFactory.create({name: 'Three'});
        const postsPage = new PostsPage(page);
        const sidebar = new SidebarPage(page);
        const modal = new CustomViewModal(page);

        // Create three views
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

        // Delete middle view — others remain
        await sidebar.getNavLink('View 2').click();

        await postsPage.openEditViewModal();
        await modal.waitForModal();
        await modal.delete();

        await expect(sidebar.getNavLink('View 1')).toBeVisible();
        await expect(sidebar.getNavLink('View 2')).toBeHidden();
        await expect(sidebar.getNavLink('View 3')).toBeVisible();

        // Delete active view — redirects to Posts
        await sidebar.getNavLink('View 1').click();

        await postsPage.openEditViewModal();
        await modal.waitForModal();
        await modal.delete();

        await expect(page).toHaveURL(/\/ghost\/#\/posts\/?$/);
        await expect(sidebar.getNavLink('Posts')).toHaveAttribute('aria-current', 'page');
        await expect(sidebar.getNavLink('View 1')).toBeHidden();
    });

    test('duplicate view name shows validation error', async ({page}) => {
        await tagFactory.create({name: 'Articles'});
        const postsPage = new PostsPage(page);
        const sidebar = new SidebarPage(page);
        const modal = new CustomViewModal(page);

        await postsPage.goto();
        await postsPage.selectType('Draft posts');
        await postsPage.selectTag('Articles');

        await postsPage.openSaveViewModal();
        await modal.waitForModal();
        await modal.enterName('My Articles');
        await modal.save();

        await sidebar.getNavLink('Posts').click();
        await postsPage.selectType('Published posts');
        await postsPage.selectTag('Articles');

        await postsPage.openSaveViewModal();
        await modal.waitForModal();
        await modal.enterName('My Articles');
        await modal.saveButton.click();

        await expect(modal.nameError).toBeVisible();
    });

    test('custom views persist after page reload', async ({page}) => {
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

        await expect(sidebar.getNavLink('Filter Persist')).toBeVisible();
        await expect(sidebar.getNavLink('Filter Persist')).toHaveAttribute('aria-current', 'page');
        await expect(page).toHaveURL(/type=published/);
        await expect(page).toHaveURL(new RegExp(`tag=${tag.slug}`));
    });
});
