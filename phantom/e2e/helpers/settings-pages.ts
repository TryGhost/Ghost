// Settings page objects vendored from /e2e/helpers/pages/admin/settings —
// selectors kept identical to upstream.
import type {Locator, Page} from '@playwright/test';
import {BasePage} from './pages';

export class LabsSection extends BasePage {
    readonly section: Locator;
    readonly heading: Locator;

    readonly openButton: Locator;
    readonly closeButton: Locator;
    readonly content: Locator;

    constructor(page: Page) {
        super(page, '/ghost/#/settings/labs');

        this.section = page.getByTestId('labs');
        this.heading = page.getByRole('heading', {level: 5, name: 'Labs'});
        this.content = this.section.locator('[role="tabpanel"]');

        this.openButton = page.getByTestId('labs').getByRole('button', {name: 'Open'});
        this.closeButton = page.getByTestId('labs').getByRole('button', {name: 'Close'});
    }
}

export class AccessSection extends BasePage {
    readonly section: Locator;
    readonly saveButton: Locator;
    readonly visibilitySelect: Locator;
    readonly passwordInput: Locator;

    constructor(page: Page) {
        super(page, '/ghost/#/settings');

        this.section = page.getByTestId('access');
        this.saveButton = this.section.getByRole('button', {name: 'Save'});
        this.visibilitySelect = this.section.getByTestId('site-visibility-select');
        this.passwordInput = this.section.getByTestId('site-access-code');
    }

    async enablePrivateMode(password: string): Promise<void> {
        await this.selectVisibility('Private');
        await this.passwordInput.fill(password);
        await this.saveButton.click();
    }

    async disablePrivateMode(): Promise<void> {
        await this.selectVisibility('Public');
        await this.saveButton.click();
    }

    private async selectVisibility(label: 'Public' | 'Private'): Promise<void> {
        await this.visibilitySelect.click();
        const option = this.section.getByTestId('select-option').filter({hasText: new RegExp(`^${label}$`)});
        await option.waitFor({state: 'visible'});
        await option.click();
    }
}

export class PrivateSitePage extends BasePage {
    readonly accessCodeLink: Locator;
    readonly accessCodeDialog: Locator;
    readonly enterButton: Locator;

    constructor(page: Page) {
        super(page, '/');

        this.accessCodeLink = page.getByRole('link', {name: 'Enter access code'});
        this.accessCodeDialog = page.getByRole('dialog', {name: 'Enter access code'});
        this.enterButton = page.getByRole('button', {name: /Enter/});
    }

    async openAccessCodeDialog(): Promise<void> {
        await this.accessCodeLink.click();
    }
}

export class AnnouncementBarSection extends BasePage {
    readonly section: Locator;
    readonly customizeButton: Locator;
    readonly modal: Locator;
    readonly freeMembersCheckbox: Locator;
    readonly editor: Locator;
    readonly contentEditable: Locator;
    readonly announcementHeading: Locator;
    readonly previewFrame: ReturnType<Page['frameLocator']>;
    readonly announcementBarRoot: Locator;

    constructor(page: Page) {
        super(page, '/ghost/#/settings');

        this.section = page.getByTestId('announcement-bar');
        this.customizeButton = this.section.getByRole('button', {name: 'Customize'});
        this.modal = page.getByTestId('announcement-bar-modal');
        this.freeMembersCheckbox = this.modal.getByLabel('Free members');
        this.editor = this.modal.locator('.koenig-react-editor');
        this.contentEditable = this.modal.locator('[contenteditable="true"]');
        this.announcementHeading = this.modal.getByText('Announcement').first();
        this.previewFrame = page.frameLocator('[data-testid="announcement-bar-preview-iframe"] > iframe[data-visible=true]');
        this.announcementBarRoot = this.previewFrame.locator('#announcement-bar-root');
    }

    async openModal(): Promise<void> {
        await this.customizeButton.click();
        await this.modal.waitFor({state: 'visible'});
    }

    async typeAnnouncementText(text: string): Promise<void> {
        await this.editor.click();
        await this.contentEditable.waitFor({state: 'visible', timeout: 30000});
        await this.page.keyboard.type(text);
        await this.announcementHeading.click();
    }
}

export class StaffSection extends BasePage {
    readonly ownerUser: Locator;
    readonly inviteStaffButton: Locator;

    constructor(page: Page) {
        super(page, '/ghost/#/settings/staff');
        this.ownerUser = this.page.getByTestId('owner-user');
        this.inviteStaffButton = page.getByRole('button', {name: 'Invite people'});
    }

    async inviteUser(email: string): Promise<void> {
        await this.inviteStaffButton.click();
        await this.page.getByPlaceholder('jamie@example.com').fill(email);

        const responsePromise = this.page.waitForResponse(
            response => response.url().includes('/api/admin/invites/') &&
                       response.request().method() === 'POST'
        );

        await this.page.getByRole('button', {name: 'Send invitation'}).click();
        await responsePromise;
        await this.page.getByText('Invitation sent', {exact: true}).waitFor({state: 'visible'});
    }
}

export class SettingsPage extends BasePage {
    readonly searchInput: Locator;
    readonly searchClearButton: Locator;

    readonly labsSection: LabsSection;
    readonly staffSection: StaffSection;

    readonly sidebar: Locator;
    readonly labsSidebarLink: Locator;
    readonly staffSidebarLink: Locator;

    constructor(page: Page) {
        super(page, '/ghost/#/settings');

        this.sidebar = page.getByTestId('sidebar');
        this.labsSidebarLink = this.sidebar.getByText('Labs');
        this.staffSidebarLink = this.sidebar.getByText('Staff');

        this.searchInput = page.locator('input[placeholder="Search settings"]');
        this.searchClearButton = page.locator('button[aria-label="close"]').first();

        this.labsSection = new LabsSection(page);
        this.staffSection = new StaffSection(page);
    }

    async searchByInput(text: string) {
        await this.searchInput.fill(text);
    }

    override async goto() {
        const result = await super.goto();
        await this.sidebar.waitFor({state: 'visible'});
        return result;
    }
}
