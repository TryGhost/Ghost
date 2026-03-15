import {CustomViewModal, PostsPage, SidebarPage} from '@/admin-pages';
import {PostFactory, TagFactory, createPostFactory, createTagFactory} from '@/data-factory';
import {expect, test} from '@/helpers/playwright/fixture';

test.describe('Ghost Admin - Custom Views', () => {
    let postFactory: PostFactory;
    let tagFactory: TagFactory;

    test.beforeEach(async ({page}) => {
        postFactory = createPostFactory(page.request);
        tagFactory = createTagFactory(page.request);
    });

    test.describe('creating custom views', () => {
        test('saving filtered view - creates custom view in sidebar', async ({page}) => {
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
            await modal.selectColor('blue');
            await modal.save();

            await expect(sidebar.getNavLink('Featured Drafts')).toBeVisible();
            await expect(sidebar.getNavLink('Featured Drafts')).toHaveAttribute('aria-current', 'page');
        });

        test('saving view with duplicate name - shows validation error', async ({page}) => {
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

        test('newly created view - has correct color indicator', async ({page}) => {
            const postsPage = new PostsPage(page);
            const sidebar = new SidebarPage(page);
            const modal = new CustomViewModal(page);

            await postsPage.goto();
            await postsPage.selectType('Published posts');
            await postsPage.selectVisibility('Public');

            await postsPage.openSaveViewModal();
            await modal.waitForModal();
            await modal.enterName('Public Published');
            await modal.selectColor('green');
            await modal.save();

            await expect(sidebar.getNavLink('Public Published')).toBeVisible();
            await expect(sidebar.getCustomViewColorIndicator('Public Published')).toHaveAttribute('data-color', 'green');
        });
    });

    test.describe('navigating custom views', () => {
        test('clicking custom view in sidebar - applies correct filters', async ({page}) => {
            const tag = await tagFactory.create({name: 'Stories'});
            await postFactory.create({status: 'draft', tags: [{id: tag.id}]});
            const postsPage = new PostsPage(page);
            const sidebar = new SidebarPage(page);
            const modal = new CustomViewModal(page);

            await postsPage.goto();
            await postsPage.selectType('Draft posts');
            await postsPage.selectTag('Stories');

            await postsPage.openSaveViewModal();
            await modal.waitForModal();
            await modal.enterName('Stories Drafts');
            await modal.save();

            await sidebar.getNavLink('Posts').click();

            await sidebar.getNavLink('Stories Drafts').click();

            await expect(page).toHaveURL(/type=draft/);
            await expect(page).toHaveURL(new RegExp(`tag=${tag.slug}`));
        });

        test('clicking custom view - shows active state in sidebar', async ({page}) => {
            await tagFactory.create({name: 'Updates'});
            const postsPage = new PostsPage(page);
            const sidebar = new SidebarPage(page);
            const modal = new CustomViewModal(page);

            await postsPage.goto();
            await postsPage.selectType('Scheduled posts');
            await postsPage.selectTag('Updates');

            await postsPage.openSaveViewModal();
            await modal.waitForModal();
            await modal.enterName('Scheduled Updates');
            await modal.save();

            await expect(sidebar.getNavLink('Scheduled Updates')).toHaveAttribute('aria-current', 'page');
        });

        test('navigating from custom view to Posts - clears active state', async ({page}) => {
            await tagFactory.create({name: 'Blog'});
            const postsPage = new PostsPage(page);
            const sidebar = new SidebarPage(page);
            const modal = new CustomViewModal(page);

            await postsPage.goto();
            await postsPage.selectType('Published posts');
            await postsPage.selectTag('Blog');

            await postsPage.openSaveViewModal();
            await modal.waitForModal();
            await modal.enterName('Published Blog');
            await modal.save();

            await expect(sidebar.getNavLink('Published Blog')).toHaveAttribute('aria-current', 'page');

            await sidebar.getNavLink('Posts').click();

            await expect(sidebar.getNavLink('Published Blog')).not.toHaveAttribute('aria-current', 'page');
            await expect(sidebar.getNavLink('Posts')).toHaveAttribute('aria-current', 'page');
        });

        test('navigating between custom views - updates active state correctly', async ({page}) => {
            await tagFactory.create({name: 'Tech'});
            await tagFactory.create({name: 'Business'});
            const postsPage = new PostsPage(page);
            const sidebar = new SidebarPage(page);
            const modal = new CustomViewModal(page);

            await postsPage.goto();
            await postsPage.selectType('Draft posts');
            await postsPage.selectTag('Tech');

            await postsPage.openSaveViewModal();
            await modal.waitForModal();
            await modal.enterName('Tech Drafts');
            await modal.save();

            await sidebar.getNavLink('Posts').click();
            await postsPage.selectType('Published posts');
            await postsPage.selectTag('Business');

            await postsPage.openSaveViewModal();
            await modal.waitForModal();
            await modal.enterName('Published Business');
            await modal.save();

            await sidebar.getNavLink('Tech Drafts').click();

            await expect(sidebar.getNavLink('Tech Drafts')).toHaveAttribute('aria-current', 'page');
            await expect(sidebar.getNavLink('Published Business')).not.toHaveAttribute('aria-current', 'page');

            await sidebar.getNavLink('Published Business').click();

            await expect(sidebar.getNavLink('Published Business')).toHaveAttribute('aria-current', 'page');
            await expect(sidebar.getNavLink('Tech Drafts')).not.toHaveAttribute('aria-current', 'page');
        });
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
