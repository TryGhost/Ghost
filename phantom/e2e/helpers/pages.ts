// Page objects vendored from /e2e/helpers/pages — selectors kept identical to
// upstream so the suites stay comparable. Keep edits minimal and upstream-ish.
import type {Locator, Page, Response} from '@playwright/test';

export interface pageGotoOptions {
    referer?: string;
    timeout?: number;
    waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' | 'commit';
}

export class BasePage {
    public pageUrl: string = '';
    protected readonly page: Page;
    public readonly body: Locator;

    constructor(page: Page, pageUrl: string = '') {
        this.page = page;
        this.pageUrl = pageUrl;
        this.body = page.locator('body');
    }

    async refresh() {
        await this.page.reload();
    }

    async goto(url?: string, options?: pageGotoOptions): Promise<null | Response> {
        const urlToVisit = url || this.pageUrl;
        return await this.page.goto(urlToVisit, options);
    }

    async pressKey(key: string) {
        await this.page.keyboard.press(key);
    }
}

export class AdminPage extends BasePage {
    constructor(page: Page) {
        super(page, '/ghost');
    }
}

export class LoginPage extends AdminPage {
    readonly emailAddressField: Locator;
    readonly passwordField: Locator;
    readonly signInButton: Locator;
    readonly forgotButton: Locator;

    constructor(page: Page) {
        super(page);
        this.pageUrl = '/ghost/#/signin';

        this.emailAddressField = page.getByRole('textbox', {name: 'Email address'});
        this.passwordField = page.getByRole('textbox', {name: 'Password'});
        this.signInButton = page.getByRole('button', {name: 'Sign in →'});
        this.forgotButton = page.getByRole('button', {name: 'Forgot?'});
    }

    async signIn(email: string, password: string) {
        await this.emailAddressField.fill(email);
        await this.passwordField.fill(password);
        await this.signInButton.click();
    }

    async logout() {
        await this.page.goto('/ghost/#/signout');
        await this.signInButton.waitFor({state: 'visible'});
    }
}

export class PostsPage extends AdminPage {
    public readonly postsList: Locator;
    public readonly postsListItem: Locator;
    public readonly newPostButton: Locator;

    constructor(page: Page) {
        super(page);
        this.pageUrl = '/ghost/#/posts';

        this.postsList = page.getByTestId('posts-list');
        this.postsListItem = this.postsList.getByTestId('posts-list-item');
        this.newPostButton = page.getByRole('link', {name: 'New post', exact: true});
    }

    getPostByTitle(title: string): Locator {
        return this.postsListItem.filter({has: this.page.getByRole('heading', {name: title, exact: true, level: 3})});
    }

    async waitForPageToFullyLoad() {
        await this.page.waitForURL(this.pageUrl);
        await this.postsList.waitFor({state: 'visible'});
    }
}

export class TagsPage extends AdminPage {
    readonly pageContent: Locator;
    readonly tagList: Locator;
    readonly tagListRow: Locator;
    readonly tabs: Locator;
    readonly activeTab: Locator;
    readonly newTagButton: Locator;
    readonly createNewTagButton: Locator;

    constructor(page: Page) {
        super(page);

        this.pageUrl = '/ghost/#/tags';
        this.pageContent = page.getByTestId('tags-page');
        this.tagList = page.getByTestId('tags-list');
        this.tagListRow = this.tagList.getByTestId('tag-list-row');

        this.tabs = page.getByTestId('tags-header-tabs');
        this.activeTab = this.tabs.locator('[data-state="on"]');
        this.newTagButton = page.getByRole('link', {name: 'New tag'});
        this.createNewTagButton = this.pageContent.getByRole('link', {name: 'Create a new tag'});
    }

    title(name: string) {
        return this.pageContent.getByRole('heading', {name});
    }

    getRowByTitle(title: string) {
        return this.tagListRow.filter({has: this.page.getByRole('link', {name: title, exact: true})});
    }

    getTagLinkByName(name: string) {
        return this.getRowByTitle(name);
    }

    async selectTab(tabText: string) {
        const tab = this.tabs.getByLabel(tabText);
        await tab.click();
    }

    async waitForPageToFullyLoad() {
        await this.page.waitForURL(this.pageUrl);
        await this.pageContent.waitFor({state: 'visible'});
    }
}

export class TagDetailsPage extends AdminPage {
    readonly nameInput: Locator;
    readonly slugInput: Locator;
    readonly descriptionInput: Locator;
    readonly saveButton: Locator;
    readonly saveButtonSuccess: Locator;
    readonly deleteButton: Locator;
    readonly backLink: Locator;

    constructor(page: Page) {
        super(page);

        this.backLink = page.locator('[data-test-link="tags-back"]');
        this.nameInput = page.getByRole('textbox', {name: 'Name'});
        this.slugInput = page.getByRole('textbox', {name: 'Slug'});
        this.descriptionInput = page.getByRole('textbox', {name: 'Description'});
        this.saveButton = page.getByRole('button', {name: 'Save'});
        this.saveButtonSuccess = page.getByRole('button', {name: 'Saved'});
        this.deleteButton = page.getByRole('button', {name: 'Delete tag'});
    }

    async fillTagName(name: string) {
        await this.nameInput.fill(name);
    }

    async fillTagSlug(slug: string) {
        await this.slugInput.fill(slug);
    }

    async save() {
        await this.saveButton.click();
        await this.saveButtonSuccess.waitFor({state: 'visible'});
    }

    async updateTag(name: string, slug: string) {
        await this.fillTagName(name);
        await this.fillTagSlug(slug);
        await this.save();
    }

    async goBackToTagsList() {
        await this.backLink.click();
    }
}

export class NewTagsPage extends TagDetailsPage {
    constructor(page: Page) {
        super(page);
        this.pageUrl = '/ghost/#/tags/new';
    }

    async createTag(name: string, slug: string) {
        await this.fillTagName(name);
        await this.fillTagSlug(slug);
        await this.save();
    }
}

export class TagEditorPage extends TagDetailsPage {
    readonly deleteModal: Locator;
    readonly deleteModalConfirmButton: Locator;

    constructor(page: Page) {
        super(page);

        this.pageUrl = '/ghost/#/tags';

        this.deleteModal = page.locator('[data-test-modal="confirm-delete-tag"]');
        this.deleteModalConfirmButton = this.deleteModal.locator('[data-test-button="confirm"]');
    }

    async gotoTagBySlug(slug: string) {
        this.pageUrl = `/ghost/#/tags/${slug}`;
        await this.page.goto(this.pageUrl);
    }

    async deleteTag() {
        await this.deleteButton.click();
    }

    async confirmDelete() {
        await this.deleteModalConfirmButton.click();
    }
}

export type UserRole = 'Administrator' | 'Editor' | 'Author' | 'Contributor';

export interface NavItem {
    name: string;
    path: RegExp;
    directUrl: string;
    roles: UserRole[];
}

/**
 * Navigation items in the sidebar with their expected paths and role visibility.
 * Used for navigation tests and force upgrade redirect validation.
 */
export const NAV_ITEMS: NavItem[] = [
    {name: 'Analytics', path: /\/ghost\/#\/analytics\/?$/, directUrl: '/ghost/#/analytics', roles: ['Administrator']},
    {name: 'Network', path: /\/ghost\/#\/(network|activitypub)\/?/, directUrl: '/ghost/#/activitypub', roles: ['Administrator']},
    {name: 'View site', path: /\/ghost\/#\/site\/?$/, directUrl: '/ghost/#/site', roles: ['Administrator', 'Editor']},
    {name: 'Posts', path: /\/ghost\/#\/posts\/?$/, directUrl: '/ghost/#/posts', roles: ['Administrator', 'Editor', 'Author', 'Contributor']},
    {name: 'Pages', path: /\/ghost\/#\/pages\/?$/, directUrl: '/ghost/#/pages', roles: ['Administrator', 'Editor']},
    {name: 'Tags', path: /\/ghost\/#\/tags\/?$/, directUrl: '/ghost/#/tags', roles: ['Administrator', 'Editor']},
    {name: 'Members', path: /\/ghost\/#\/members\/?$/, directUrl: '/ghost/#/members', roles: ['Administrator', 'Editor']}
];

/**
 * SidebarPage uses semantic, accessibility-first locators.
 * This approach tests the UI as users interact with it, not implementation details.
 */
export class SidebarPage extends AdminPage {
    public readonly sidebar: Locator;
    public readonly postsToggle: Locator;
    public readonly userDropdownTrigger: Locator;
    public readonly nightShiftToggle: Locator;
    public readonly whatsNewButton: Locator;
    public readonly userProfileLink: Locator;
    public readonly signOutLink: Locator;
    public readonly networkNotificationBadge: Locator;
    public readonly ghostProLink: Locator;
    public readonly upgradeNowLink: Locator;
    public readonly themeErrorBanner: Locator;
    public readonly themeErrorDialog: Locator;

    constructor(page: Page) {
        super(page);
        this.sidebar = page.getByRole('navigation');
        this.postsToggle = this.sidebar.getByRole('button', {name: /toggle post views/i});
        this.userDropdownTrigger = page.locator('[data-test-nav="arrow-down"]');
        this.nightShiftToggle = page.getByRole('menuitem', {name: /dark mode/i}).getByRole('switch');
        this.whatsNewButton = page.getByRole('menuitem', {name: /what's new/i});
        this.userProfileLink = page.getByRole('menuitem', {name: /your profile/i});
        this.signOutLink = page.getByRole('menuitem', {name: /sign out/i});

        this.networkNotificationBadge = this.sidebar
            .getByRole('listitem').filter({hasText: /network/i})
            .locator('[data-sidebar="menu-badge"]');
        this.ghostProLink = this.sidebar.getByRole('link', {name: 'Ghost(Pro)'});
        this.upgradeNowLink = this.sidebar.getByRole('link', {name: /upgrade/i});
        this.themeErrorBanner = page.getByRole('status').filter({hasText: /your theme has errors/i});
        this.themeErrorDialog = page.getByRole('dialog').filter({hasText: /theme errors/i});
    }

    getNavLink(name: string): Locator {
        return this.sidebar
            .getByRole('link')
            .filter({hasText: new RegExp(name, 'i')});
    }

    getCustomViewColorIndicator(viewName: string): Locator {
        return this.getNavLink(viewName).locator('[data-color]');
    }

    async expandPostsSubmenu(): Promise<void> {
        const isExpanded = await this.postsToggle.getAttribute('aria-expanded');
        if (isExpanded !== 'true') {
            await this.postsToggle.click();
        }
    }

    async collapsePostsSubmenu(): Promise<void> {
        const isExpanded = await this.postsToggle.getAttribute('aria-expanded');
        if (isExpanded === 'true') {
            await this.postsToggle.click();
        }
    }

    async isNightShiftEnabled(): Promise<boolean> {
        const isChecked = await this.nightShiftToggle.getAttribute('aria-checked');
        return isChecked === 'true';
    }

    async waitForNightShiftEnabled(enabled: boolean): Promise<void> {
        const locator = enabled
            ? this.page.locator('[aria-checked="true"]')
            : this.page.locator('[aria-checked="false"]');
        await locator.waitFor();
    }
}

export class HomePage extends BasePage {
    readonly title: Locator;
    readonly mainSubscribeButton: Locator;

    constructor(page: Page) {
        super(page);

        this.pageUrl = '/';
        this.mainSubscribeButton = page.getByRole('button', {name: 'Subscribe'}).first();
        this.title = page.getByRole('heading', {level: 1});
    }
}
