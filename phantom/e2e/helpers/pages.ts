// Page objects vendored from /e2e/helpers/pages — selectors kept identical to
// upstream so the suites stay comparable. Keep edits minimal and upstream-ish.
import type {Download, FrameLocator, JSHandle, Locator, Page, Response} from '@playwright/test';
import {readFileSync} from 'node:fs';

export interface ExportedFile {
    suggestedFilename: string;
    content: string;
}

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

    public readonly postsFilters: Locator;

    public readonly typeFilter: Locator;
    public readonly visibilityFilter: Locator;
    public readonly authorFilter: Locator;
    public readonly tagFilter: Locator;
    public readonly orderFilter: Locator;

    public readonly saveViewButton: Locator;
    public readonly editViewButton: Locator;

    public readonly pageTitle: Locator;

    constructor(page: Page) {
        super(page);
        this.pageUrl = '/ghost/#/posts';

        this.postsList = page.getByTestId('posts-list');
        this.postsListItem = this.postsList.getByTestId('posts-list-item');
        this.newPostButton = page.getByRole('link', {name: 'New post', exact: true});

        this.postsFilters = page.getByTestId('posts-filters');
        this.typeFilter = this.postsFilters.getByRole('button', {name: 'Type filter'});
        this.visibilityFilter = this.postsFilters.getByRole('button', {name: 'Visibility filter'});
        this.authorFilter = this.postsFilters.getByRole('button', {name: 'Author filter'});
        this.tagFilter = this.postsFilters.getByRole('button', {name: 'Tag filter'});
        this.orderFilter = this.postsFilters.getByRole('button', {name: 'Sort filter'});

        this.saveViewButton = page.getByRole('button', {name: /save as view/i});
        this.editViewButton = page.getByRole('button', {name: /edit current view/i});

        this.pageTitle = page.getByRole('heading', {level: 2});
    }

    getPostByTitle(title: string): Locator {
        return this.postsListItem.filter({has: this.page.getByRole('heading', {name: title, exact: true, level: 3})});
    }

    async waitForPageToFullyLoad() {
        await this.page.waitForURL(this.pageUrl);
        await this.postsList.waitFor({state: 'visible'});
    }

    async refreshData() {
        await this.page.reload();
    }

    async selectType(typeName: string): Promise<void> {
        await this.typeFilter.click();
        await this.page.getByRole('option', {name: typeName, exact: true}).click();
    }

    async selectVisibility(visibilityName: string): Promise<void> {
        await this.visibilityFilter.click();
        await this.page.getByRole('option', {name: visibilityName, exact: true}).click();
    }

    async selectAuthor(authorName: string): Promise<void> {
        await this.authorFilter.click();
        await this.page.getByRole('option', {name: authorName, exact: true}).click();
    }

    async selectTag(tagName: string): Promise<void> {
        await this.tagFilter.click();
        await this.page.getByRole('option', {name: tagName, exact: true}).click();
    }

    async selectOrder(orderName: string): Promise<void> {
        await this.orderFilter.click();
        await this.page.getByRole('option', {name: orderName, exact: true}).click();
    }

    async openSaveViewModal(): Promise<void> {
        await this.saveViewButton.waitFor({state: 'visible'});
        await this.saveViewButton.click();
    }

    async openEditViewModal(): Promise<void> {
        await this.editViewButton.waitFor({state: 'visible'});
        await this.editViewButton.click();
    }

    async getActiveViewName(): Promise<string | null> {
        return await this.pageTitle.textContent();
    }
}

export class CustomViewModal {
    private readonly page: Page;
    public readonly modal: Locator;
    public readonly nameInput: Locator;
    public readonly nameError: Locator;
    public readonly saveButton: Locator;
    public readonly deleteButton: Locator;
    public readonly cancelButton: Locator;

    constructor(page: Page) {
        this.page = page;
        this.modal = page.getByRole('dialog');
        this.nameInput = page.getByLabel('View name');
        this.nameError = page.locator('[data-test-error="custom-view-name"]');
        this.saveButton = this.modal.getByRole('button', {name: 'Save'});
        this.deleteButton = this.modal.getByRole('button', {name: 'Delete'});
        this.cancelButton = this.modal.getByRole('button', {name: 'Cancel'});
    }

    async waitForModal(): Promise<void> {
        await this.modal.waitFor({state: 'visible'});
    }

    async enterName(name: string): Promise<void> {
        await this.nameInput.fill(name);
    }

    async selectColor(color: string): Promise<void> {
        await this.page.getByLabel(color).click();
    }

    async save(): Promise<void> {
        await this.saveButton.click();
        await this.modal.waitFor({state: 'hidden'});
    }

    async delete(): Promise<void> {
        await this.deleteButton.click();
        await this.modal.waitFor({state: 'hidden'});
    }

    async cancel(): Promise<void> {
        await this.cancelButton.click();
        await this.modal.waitFor({state: 'hidden'});
    }
}

class PreviewFrame {
    protected readonly page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    protected async waitForEscapeScriptToBeReady(): Promise<void> {
        await this.page.waitForFunction(
            () => {
                const iframe = document.querySelector('iframe[title*="preview"]') as HTMLIFrameElement;
                if (!iframe?.contentWindow) {
                    return false;
                }

                try {
                    const iframeWindow = iframe.contentWindow as Window & {
                        ghostPreviewEscapeHandlerReady?: boolean;
                    };
                    return iframeWindow.ghostPreviewEscapeHandlerReady === true;
                } catch {
                    return false;
                }
            },
            {timeout: 5000}
        );
    }
}

export class EmailPreviewFrame extends PreviewFrame {
    readonly frame: FrameLocator;
    readonly previewBody: Locator;
    readonly frameBody: Locator;

    constructor(page: Page) {
        super(page);
        this.frame = this.page.frameLocator('iframe[title="Email preview"]');

        this.previewBody = this.frame.getByTestId('email-preview-body');
        this.frameBody = this.frame.locator('body');
    }

    async content(): Promise<string | null> {
        await this.previewBody.waitFor({state: 'visible'});
        return await this.previewBody.textContent();
    }
}

export class DesktopPreviewFrame extends PreviewFrame {
    readonly desktopPreviewFrame: FrameLocator;

    constructor(page: Page) {
        super(page);
        this.desktopPreviewFrame = page.frameLocator('iframe[title="Desktop browser post preview"]');
    }

    async focus(): Promise<void> {
        await this.desktopPreviewFrame.getByRole('heading', {level: 1}).click();
    }

    async clickPostLinkByTitle(title: string): Promise<void> {
        await this.waitForPreviewModalFrame();

        await this.desktopPreviewFrame.getByRole('link', {name: new RegExp(title, 'i')}).click();
        await this.desktopPreviewFrame.getByRole('heading', {level: 1, name: new RegExp(title, 'i')}).waitFor({state: 'visible', timeout: 10000});

        await this.waitForEscapeScriptToBeReady();
    }

    async waitForPreviewModalFrame(): Promise<void> {
        await this.waitForPreviewContentToLoad();
        await this.waitForEscapeScriptToBeReady();
    }

    private async waitForPreviewContentToLoad(): Promise<void> {
        await this.desktopPreviewFrame.getByRole('heading', {level: 1}).waitFor({state: 'visible', timeout: 20000});
        await this.desktopPreviewFrame.getByRole('article').first().waitFor({state: 'visible', timeout: 20000});
    }
}

export class PostPreviewModal {
    private readonly page: Page;
    readonly modal: Locator;
    readonly header: Locator;
    readonly closeButton: Locator;

    readonly webTabButton: Locator;
    readonly emailTabButton: Locator;

    public readonly desktopPreview: DesktopPreviewFrame;
    public readonly emailPreview: EmailPreviewFrame;

    constructor(page: Page) {
        this.page = page;
        this.modal = this.page.getByRole('banner').filter({hasText: 'Preview'});
        this.header = this.modal.getByRole('heading', {name: 'Preview'});
        this.closeButton = this.modal.getByRole('button', {name: 'Close'});

        this.desktopPreview = new DesktopPreviewFrame(page);
        this.emailPreview = new EmailPreviewFrame(page);

        this.webTabButton = this.modal.getByRole('button', {name: 'Web'});
        this.emailTabButton = this.modal.getByRole('button', {name: 'Email'});
    }

    async switchToEmailTab(): Promise<void> {
        await this.emailTabButton.click();
        await this.emailPreview.frameBody.waitFor({state: 'visible'});
    }

    async emailPreviewContent(): Promise<string | null> {
        return await this.emailPreview.content();
    }

    async close(): Promise<void> {
        await this.closeButton.click();
        await this.modal.waitFor({state: 'hidden'});
    }
}

class SettingsMenu extends BasePage {
    readonly postUrlInput: Locator;
    readonly publishDateInput: Locator;
    readonly publishTimeInput: Locator;
    readonly customExcerptInput: Locator;
    readonly deletePostButton: Locator;
    readonly deletePostConfirmButton: Locator;

    constructor(page: Page) {
        super(page);

        this.postUrlInput = page.getByRole('textbox', {name: 'Post URL'});
        this.publishDateInput = page.getByLabel('Date Picker');
        this.publishTimeInput = page.getByLabel('Time Picker');
        this.customExcerptInput = page.locator('[data-test-field="custom-excerpt"]');
        this.deletePostButton = page.locator('[data-test-button="delete-post"]');
        this.deletePostConfirmButton = page.locator('[data-test-button="delete-post-confirm"]');
    }

    async deletePost(): Promise<void> {
        await this.deletePostButton.click();
        await this.deletePostConfirmButton.click();
    }
}

class PublishFlow extends BasePage {
    readonly publishButton: Locator;
    readonly publishTypeSetting: Locator;
    readonly publishTypeButton: Locator;
    readonly publishAtButton: Locator;
    readonly scheduleSummary: Locator;
    readonly scheduleDateInput: Locator;
    readonly scheduleTimeInput: Locator;
    readonly emailRecipientsSetting: Locator;
    readonly continueButton: Locator;
    readonly confirmButton: Locator;
    readonly closeButton: Locator;
    readonly completeBookmark: Locator;

    constructor(page: Page) {
        super(page);

        this.publishButton = page.locator('[data-test-button="publish-flow"]').first();
        this.publishTypeSetting = page.locator('[data-test-setting="publish-type"]');
        this.publishTypeButton = this.publishTypeSetting.locator('> button');
        this.publishAtButton = page.locator('[data-test-setting="publish-at"] > button');
        this.scheduleSummary = page.locator('[data-test-setting="publish-at"] [data-test-setting-title]');
        this.scheduleDateInput = page.locator('[data-test-date-time-picker-date-input]');
        this.scheduleTimeInput = page.locator('[data-test-date-time-picker-time-input]');
        this.emailRecipientsSetting = page.locator('[data-test-setting="email-recipients"]');
        this.continueButton = page.locator('[data-test-modal="publish-flow"] [data-test-button="continue"]');
        this.confirmButton = page.locator('[data-test-modal="publish-flow"] [data-test-button="confirm-publish"]');
        this.closeButton = page.locator('[data-test-button="close-publish-flow"]');
        this.completeBookmark = page.locator('[data-test-complete-bookmark]');
    }

    async open(): Promise<void> {
        await this.publishButton.click();
    }

    async close(): Promise<void> {
        await this.closeButton.click();
    }

    async selectPublishType(type: 'publish' | 'publish+send' | 'send'): Promise<void> {
        await this.publishTypeButton.click();
        await this.page.locator(`[data-test-publish-type="${type}"] + label`).click();
    }

    async schedule({date, time}: {date?: string; time?: string}): Promise<void> {
        await this.publishAtButton.click();

        const textBeforeScheduleToggle = await this.scheduleSummary.textContent();
        await this.page.locator('[data-test-radio="schedule"] + label').click();
        await this.waitForScheduleSummaryChange(textBeforeScheduleToggle);

        if (date) {
            const textBeforeDateChange = await this.scheduleSummary.textContent();
            await this.scheduleDateInput.fill(date);
            await this.scheduleDateInput.blur();
            await this.waitForScheduleSummaryChange(textBeforeDateChange);
        }

        if (time) {
            await this.scheduleTimeInput.fill(time);
            await this.scheduleTimeInput.blur();
        }
    }

    async confirm(): Promise<void> {
        await this.continueButton.click();
        await this.confirmButton.click({force: true});
        await this.confirmButton.waitFor({state: 'hidden'});
    }

    async openPublishedPost(): Promise<Page> {
        const [frontendPage] = await Promise.all([
            this.page.waitForEvent('popup'),
            this.completeBookmark.click()
        ]);
        return frontendPage;
    }

    private async waitForScheduleSummaryChange(previousText: string | null): Promise<void> {
        await this.page.waitForFunction((text) => {
            const element = document.querySelector('[data-test-setting="publish-at"] [data-test-setting-title]');
            const currentText = element?.textContent?.trim();
            return Boolean(currentText && currentText !== text?.trim());
        }, previousText);
    }
}

export class PostEditorPage extends AdminPage {
    readonly titleInput: Locator;
    readonly postStatus: Locator;
    readonly previewButton: Locator;
    readonly previewModal: PostPreviewModal;
    readonly settingsToggleButton: Locator;
    readonly publishFlow: PublishFlow;
    readonly screenTitle: Locator;
    readonly lexicalEditor: Locator;
    readonly secondaryEditor: Locator;
    readonly publishSaveButton: Locator;
    readonly updateFlowButton: Locator;
    readonly revertToDraftButton: Locator;

    readonly settingsMenu: SettingsMenu;

    constructor(page: Page) {
        super(page);
        this.pageUrl = '/ghost/#/editor/post/';

        this.titleInput = page.locator('[data-test-editor-title-input]');
        this.postStatus = page.locator('[data-test-editor-post-status]');
        this.previewButton = page.getByRole('button', {name: 'Preview'});
        this.previewModal = new PostPreviewModal(page);
        this.settingsToggleButton = page.getByTestId('settings-menu-toggle');
        this.publishFlow = new PublishFlow(page);
        this.screenTitle = page.locator('[data-test-screen-title]');
        this.lexicalEditor = page.locator('[data-kg="editor"]').first();
        this.secondaryEditor = page.locator('[data-secondary-instance="true"]');
        this.publishSaveButton = page.locator('[data-test-button="publish-save"]').first();
        this.updateFlowButton = page.locator('[data-test-button="update-flow"]').first();
        this.revertToDraftButton = page.locator('[data-test-button="revert-to-draft"]');

        this.settingsMenu = new SettingsMenu(page);
    }

    async gotoPost(postId: string): Promise<void> {
        await this.page.goto(`/ghost/#/editor/post/${postId}`);
        await this.titleInput.waitFor({state: 'visible'});
    }

    async createDraft({title = 'Hello world', body = 'This is my post body.'} = {}): Promise<void> {
        const editor = this.page.locator('[data-lexical-editor="true"]').first();

        await this.titleInput.click();
        await this.titleInput.fill(title);
        await editor.waitFor({state: 'visible'});
        await this.page.keyboard.press('Enter');

        await this.page.waitForFunction(() => {
            const element = document.querySelector('[data-lexical-editor="true"]');
            if (!element) {
                return false;
            }

            const activeElement = document.activeElement;

            return Boolean(
                activeElement &&
                (activeElement === element || element.contains(activeElement))
            );
        });

        await this.page.keyboard.type(body);
    }

    async waitForSaved(): Promise<void> {
        await this.postStatus.filter({hasText: /Saved/}).waitFor({timeout: 30000});
    }

    async appendToBody(text: string): Promise<void> {
        await this.lexicalEditor.click();
        await this.page.keyboard.type(text);
    }

    async revertToDraft(): Promise<void> {
        await this.updateFlowButton.click();
        await this.revertToDraftButton.click();
    }

    get previewModalDesktopFrame(): DesktopPreviewFrame {
        return this.previewModal.desktopPreview;
    }
}

export class MembersListPage extends AdminPage {
    readonly memberRows: Locator;
    readonly searchInput: Locator;
    readonly actionsButton: Locator;
    readonly newMemberButton: Locator;
    readonly filterButton: Locator;
    readonly clearFiltersButton: Locator;
    readonly emptyState: Locator;
    readonly addYourselfButton: Locator;
    readonly noResults: Locator;
    readonly showAllButton: Locator;

    constructor(page: Page) {
        super(page);
        this.pageUrl = '/ghost/#/members';

        this.memberRows = page.getByTestId('members-list-item');
        this.searchInput = page.getByTestId('members-search-input');
        this.actionsButton = page.getByTestId('members-actions');
        this.newMemberButton = page.getByRole('link', {name: 'New member'});
        this.filterButton = page.getByRole('button', {name: /^(Filter|Add filter)$/});
        this.clearFiltersButton = page.getByRole('button', {name: 'Clear'});
        this.emptyState = page.getByText('Start building your audience');
        this.addYourselfButton = page.getByRole('button', {name: 'Add yourself as a member to test'});
        this.noResults = page.getByText('No matching members found.');
        this.showAllButton = page.getByRole('button', {name: 'Show all members'});
    }

    getMemberByName(name: string): Locator {
        return this.memberRows.filter({
            has: this.page.getByRole('link', {name, exact: true})
        });
    }

    getMemberLinkByName(name: string): Locator {
        return this.getMemberByName(name).getByRole('link', {name, exact: true});
    }

    async openMemberByName(name: string): Promise<void> {
        await this.getMemberLinkByName(name).click();
    }

    async openActionsMenu(): Promise<void> {
        await this.actionsButton.click();
    }

    async getVisibleMemberCount(): Promise<number> {
        return await this.memberRows.count();
    }

    getMenuItem(name: string | RegExp): Locator {
        return this.page.getByRole('menuitem', {name});
    }

    async addFilter(fieldName: string, value: string): Promise<void> {
        await this.filterButton.click();
        await this.page.getByRole('option', {name: fieldName, exact: true}).click();

        if (fieldName === 'Name' || fieldName === 'Email') {
            const placeholder = fieldName === 'Name' ? 'Enter name...' : 'Enter email...';
            await this.page.getByRole('textbox', {name: placeholder}).fill(value);
        } else {
            // For select-based filters (Label, Status, etc.)
            await this.page.getByRole('option', {name: value, exact: true}).click();
        }
    }

    async addSearchableFilter(fieldName: string, searchText: string, optionName: string): Promise<void> {
        await this.filterButton.click();
        await this.page.getByRole('option', {name: fieldName, exact: true}).click();
        await this.page.getByPlaceholder(`Search ${fieldName.toLowerCase()}...`).pressSequentially(searchText);
        await this.page.getByRole('option', {name: optionName}).click();
    }

    async applyLabelFilter(labelName: string): Promise<void> {
        await this.addSearchableFilter('Label', labelName, labelName);
    }

    async exportMembers(): Promise<ExportedFile> {
        const download = await this.exportMembersData();
        const suggestedFilename = download.suggestedFilename();
        const downloadPath = await download.path();
        const downloadContent = readFileSync(downloadPath as string, 'utf-8');

        return {
            suggestedFilename,
            content: downloadContent
        };
    }

    async exportMembersData(): Promise<Download> {
        const downloadPromise = this.page.waitForEvent('download');
        await this.getMenuItem(/Export/).click();
        return await downloadPromise;
    }

    async saveCurrentView(name: string): Promise<void> {
        await this.page.getByRole('button', {name: 'Save view'}).click();
        const dialog = this.page.getByRole('dialog');
        await dialog.waitFor({state: 'visible'});
        await dialog.getByRole('textbox', {name: 'View name'}).fill(name);
        await dialog.getByRole('button', {name: 'Save'}).click();
        await dialog.waitFor({state: 'hidden'});
    }
}

export class MembersPage extends AdminPage {
    readonly newMemberButton: Locator;
    public readonly loadMoreButton: Locator;
    public readonly membersListScrollRoot: Locator;
    readonly memberListItems: Locator;

    constructor(page: Page, {route = 'members'}: {route?: string} = {}) {
        super(page);
        this.pageUrl = `/ghost/#/${route}`;

        this.newMemberButton = page.getByRole('link', {name: 'New member'});

        this.loadMoreButton = page.getByRole('button', {name: 'Load more'});
        this.membersListScrollRoot = page.getByTestId('members-list-scroll-root');
        this.memberListItems = page.getByTestId('members-list-item');
    }

    async clickMemberByEmail(email: string): Promise<void> {
        await this.memberListItems.filter({hasText: email}).click();
    }

    async getMaxRenderedIndex(): Promise<number> {
        return await this.memberListItems.evaluateAll((rows) => {
            return rows.reduce((maxIndex, row) => {
                return Math.max(maxIndex, Number(row.getAttribute('data-index') || '-1'));
            }, -1);
        });
    }

    private async getMembersScrollParentHandle(): Promise<JSHandle<HTMLElement>> {
        return await this.membersListScrollRoot.evaluateHandle((element) => {
            let node: Node | null = element;

            while (node) {
                if (node instanceof HTMLElement) {
                    const overflowY = window.getComputedStyle(node).overflowY;
                    const isScrollable = overflowY !== 'visible' && overflowY !== 'hidden';

                    if (isScrollable && node.scrollHeight >= node.clientHeight) {
                        return node;
                    }
                }

                node = node.parentNode;
            }

            return document.body;
        }) as JSHandle<HTMLElement>;
    }

    async getScrollParentScrollTop(): Promise<number> {
        const scrollParent = await this.getMembersScrollParentHandle();

        try {
            return await scrollParent.evaluate(element => element.scrollTop);
        } finally {
            await scrollParent.dispose();
        }
    }

    async scrollScrollParentBy(deltaY: number): Promise<void> {
        const scrollParent = await this.getMembersScrollParentHandle();

        try {
            await scrollParent.evaluate((element, pixels) => {
                element.scrollBy(0, pixels);
            }, deltaY);
        } finally {
            await scrollParent.dispose();
        }
    }

    async scrollUntilMaxRenderedIndexAtLeast(targetIndex: number): Promise<number> {
        let maxRenderedIndex = await this.getMaxRenderedIndex();

        for (let i = 0; i < 30 && maxRenderedIndex < targetIndex; i += 1) {
            await this.scrollScrollParentBy(4000);
            await this.page.waitForFunction((previousMaxIndex) => {
                const rows = Array.from(document.querySelectorAll('[data-testid="members-list-item"]'));

                return rows.some(row => Number(row.getAttribute('data-index') || '-1') > previousMaxIndex);
            }, maxRenderedIndex);
            maxRenderedIndex = await this.getMaxRenderedIndex();
        }

        return maxRenderedIndex;
    }

    getMemberByName(name: string): Locator {
        return this.memberListItems.filter({hasText: name});
    }
}

class MemberSettingsSection extends BasePage {
    readonly memberActionsButton: Locator;
    readonly impersonateButton: Locator;
    readonly deleteButton: Locator;
    readonly confirmDeleteButton: Locator;
    readonly cancelDeleteButton: Locator;

    constructor(page: Page) {
        super(page);
        this.memberActionsButton = page.getByTestId('member-actions');
        this.impersonateButton = page.getByRole('button', {name: 'Impersonate'});
        this.deleteButton = page.getByRole('button', {name: 'Delete member'});
        this.confirmDeleteButton = page.getByTestId('confirm-delete-member');
        this.cancelDeleteButton = page.getByTestId('cancel-delete-member');
    }
}

export class MemberDetailsPage extends AdminPage {
    readonly nameInput: Locator;
    readonly emailInput: Locator;
    readonly noteInput: Locator;
    readonly labelsInput: Locator;
    readonly labels: Locator;

    readonly saveButton: Locator;
    readonly savedButton: Locator;
    readonly retryButton: Locator;
    readonly membersBackLink: Locator;
    readonly settingsSection: MemberSettingsSection;

    constructor(page: Page) {
        super(page);
        this.pageUrl = '/ghost/#/members/';

        this.nameInput = page.getByRole('textbox', {name: 'Name'});
        this.emailInput = page.getByRole('textbox', {name: 'Email'});
        this.noteInput = page.getByRole('textbox', {name: 'Note'});
        this.labelsInput = page.getByText('Labels').locator('+ div');
        this.labels = this.labelsInput.getByRole('listitem');

        this.saveButton = page.getByRole('button', {name: 'Save'});
        this.savedButton = page.getByRole('button', {name: 'Saved'});
        this.retryButton = page.getByRole('button', {name: 'Retry'});
        this.membersBackLink = page.locator('[data-test-link="members-back"]');
        this.settingsSection = new MemberSettingsSection(page);
    }

    async fillMemberDetails(name: string, email: string, note: string): Promise<void> {
        await this.nameInput.fill(name);
        await this.emailInput.fill(email);
        await this.noteInput.fill(note);
    }

    async labelNames() {
        return await this.labels.allInnerTexts();
    }

    async addLabel(label: string): Promise<void> {
        await this.labelsInput.click();
        await this.page.keyboard.type(label);
        await this.page.keyboard.press('Tab');
    }

    async save(): Promise<void> {
        await this.saveButton.click();
        await this.savedButton.waitFor({state: 'visible'});
    }
}

export class PostPage extends BasePage {
    readonly postTitle: Locator;
    readonly postContent: Locator;
    readonly articleTitle: Locator;
    readonly articleHeader: Locator;
    readonly articleBody: Locator;
    readonly metaDescription: Locator;

    constructor(page: Page) {
        super(page);
        this.postTitle = page.locator('article h1').first();
        this.postContent = page.locator('article.gh-article');
        this.articleTitle = page.locator('.gh-article-title');
        this.articleHeader = page.locator('main > article > header');
        this.articleBody = page.locator('.gh-content.gh-canvas > p');
        this.metaDescription = page.locator('meta[name="description"]');
    }

    async gotoPost(slug: string): Promise<void> {
        await this.goto(`/${slug}/`);
        await this.waitForPostToLoad();
    }

    async waitForPostToLoad(): Promise<void> {
        await this.postTitle.waitFor({state: 'visible'});
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
