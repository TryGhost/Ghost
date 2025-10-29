import {AdminPage} from '../../AdminPage';
import {BasePage} from '../../../BasePage';
import {Locator, Page} from '@playwright/test';
import {PostPreviewModal} from './PostPreviewModal';

class SettingsMenu extends BasePage {
    private readonly excerptTextField: Locator;
    private readonly publishDateTextBox: Locator;

    constructor(page: Page) {
        super(page);

        this.excerptTextField = page.getByRole('textbox', {name: 'Excerpt'});
        this.publishDateTextBox = page.getByRole('textbox', {name: 'YYYY-MM-DD'});
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
        await this.page.goto(`${this.pageUrl}/${postId}`);
        await this.titleInput.waitFor({state: 'visible'});
    }
}
