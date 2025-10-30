import {AdminPage} from '../AdminPage';
import {Locator, Page} from '@playwright/test';
import {PostPreviewModal} from './PostPreviewModal';

export class PostEditorPage extends AdminPage {
    readonly titleInput: Locator;
    readonly previewButton: Locator;
    readonly previewModal: PostPreviewModal;

    constructor(page: Page) {
        super(page);
        this.pageUrl = '/ghost/#/editor/post/';

        this.titleInput = page.getByRole('textbox', {name: 'Post title'});
        this.previewButton = page.getByRole('button', {name: 'Preview'});
        this.previewModal = new PostPreviewModal(page);
    }

    async gotoPost(postId: string): Promise<void> {
        await this.page.goto(`/ghost/#/editor/post/${postId}`);
        await this.titleInput.waitFor({state: 'visible'});
    }
}
