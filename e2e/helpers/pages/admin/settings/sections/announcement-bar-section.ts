import {BasePage} from '@/helpers/pages';
import {FrameLocator, Locator, Page} from '@playwright/test';

export class AnnouncementBarSection extends BasePage {
    readonly section: Locator;
    readonly customizeButton: Locator;
    readonly modal: Locator;
    readonly freeMembersCheckbox: Locator;
    readonly editor: Locator;
    readonly contentEditable: Locator;
    readonly announcementHeading: Locator;
    readonly previewFrame: FrameLocator;
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
