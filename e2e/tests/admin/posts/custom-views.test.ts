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
});
