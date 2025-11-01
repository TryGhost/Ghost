import {AdminPage} from '../../AdminPage';
import {BasePage} from '../../../BasePage';
import {Locator, Page} from '@playwright/test';
import {PostPreviewModal} from './PostPreviewModal';

class SettingsMenu extends BasePage {
    readonly postUrlInput: Locator;
    readonly publishDateInput: Locator;
    readonly publishTimeInput: Locator;

    constructor(page: Page) {
        super(page);

        this.postUrlInput = page.getByRole('textbox', {name: 'Post URL'});
        this.publishDateInput = page.getByLabel('Date Picker');
        this.publishTimeInput = page.getByLabel('Time Picker');
    }
}

export class PostEditorPage extends AdminPage {
    readonly titleInput: Locator;
    readonly previewButton: Locator;
    readonly previewModal: PostPreviewModal;
    readonly settingsToggleButton: Locator;

    readonly settingsMenu: SettingsMenu;

    constructor(page: Page) {
        super(page);
        this.pageUrl = '/ghost/#/editor/post/';

        this.titleInput = page.getByRole('textbox', {name: 'Post title'});
        this.previewButton = page.getByRole('button', {name: 'Preview'});
        this.previewModal = new PostPreviewModal(page);
        this.settingsToggleButton = page.getByTestId('settings-menu-toggle');

        this.settingsMenu = new SettingsMenu(page);
    }

    async gotoPost(postId: string): Promise<void> {
        await this.page.goto(`/ghost/#/editor/post/${postId}`);
        await this.titleInput.waitFor({state: 'visible'});
    }
}
