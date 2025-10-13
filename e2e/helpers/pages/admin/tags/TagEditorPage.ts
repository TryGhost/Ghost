import {Locator, Page} from '@playwright/test';
import {TagDetailsPage} from './TagDetailsPage';

export class TagEditorPage extends TagDetailsPage {
    readonly deleteModal: Locator;
    readonly deleteModalPostsCount: Locator;
    readonly deleteModalConfirmButton: Locator;

    readonly navMenuItem: Locator;

    constructor(page: Page) {
        super(page);

        this.pageUrl = '/ghost/#/tags';

        this.deleteModal = page.locator('[data-test-modal="confirm-delete-tag"]');
        this.deleteModalPostsCount = this.deleteModal.locator('[data-test-text="posts-count"]');
        this.deleteModalConfirmButton = this.deleteModal.locator('[data-test-button="confirm"]');

        this.navMenuItem = page.locator('[data-test-nav="tags"]');
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

