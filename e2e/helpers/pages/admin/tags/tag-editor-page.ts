import {Locator, Page} from '@playwright/test';
import {TagDetailsPage} from './tag-details-page';

export class TagEditorPage extends TagDetailsPage {
    readonly deleteModal: Locator;
    readonly deleteModalPostsCount: Locator;
    readonly deleteModalConfirmButton: Locator;

    constructor(page: Page) {
        super(page);

        this.pageUrl = '/ghost/#/tags';

        this.deleteModal = page.getByTestId('confirm-delete-tag-modal');
        this.deleteModalPostsCount = this.deleteModal.getByTestId('delete-tag-posts-count');
        this.deleteModalConfirmButton = this.deleteModal.getByRole('button', {name: 'Delete', exact: true});
    }

    async gotoTagBySlug(slug: string) {
        this.pageUrl = `/ghost/#/tags/${slug}`;
        await this.page.goto(this.pageUrl);
    }

    async updateTag(name: string, slug: string) {
        await this.fillTagName(name);
        await this.fillTagSlug(slug);
        await this.save();
    }

    async deleteTag() {
        await this.deleteButton.click();
    }

    async confirmDelete() {
        await this.deleteModalConfirmButton.click();
    }
}

