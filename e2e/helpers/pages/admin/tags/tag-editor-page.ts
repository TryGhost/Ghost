import {Locator, Page} from '@playwright/test';
import {TagDetailsPage} from './tag-details-page';
import {confirmDeleteTag, deleteTagModal, deleteTagPostsCount} from '@tryghost/test-data/selectors/tags';

export class TagEditorPage extends TagDetailsPage {
    readonly deleteModal: Locator;
    readonly deleteModalPostsCount: Locator;
    readonly deleteModalConfirmButton: Locator;

    constructor(page: Page) {
        super(page);

        this.pageUrl = '/ghost/#/tags';

        // Ember renders data-test-* attributes; React renders data-testid.
        // Match either so the same flows drive both implementations.
        this.deleteModal = page.locator('[data-test-modal="confirm-delete-tag"]')
            .or(page.getByTestId(deleteTagModal))
            .filter({visible: true});
        this.deleteModalPostsCount = this.deleteModal.locator('[data-test-text="posts-count"]')
            .or(this.deleteModal.getByTestId(deleteTagPostsCount));
        this.deleteModalConfirmButton = this.deleteModal.locator('[data-test-button="confirm"]')
            .or(this.deleteModal.getByTestId(confirmDeleteTag));
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
