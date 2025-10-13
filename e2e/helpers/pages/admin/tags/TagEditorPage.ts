import {Locator, Page} from '@playwright/test';
import {AdminPage} from '../AdminPage';

export class TagEditorPage extends AdminPage {
    readonly nameInput: Locator;
    readonly slugInput: Locator;
    readonly descriptionInput: Locator;
    readonly saveButton: Locator;
    readonly deleteButton: Locator;
    readonly backLink: Locator;

    readonly deleteModal: Locator;
    readonly deleteModalPostsCount: Locator;
    readonly deleteModalConfirmButton: Locator;

    readonly navMenuItem: Locator;

    constructor(page: Page) {
        super(page);

        this.pageUrl = '/ghost/#/tags';
        
        this.nameInput = page.locator('[data-test-input="tag-name"]');
        this.slugInput = page.locator('[data-test-input="tag-slug"]');
        this.descriptionInput = page.locator('[data-test-input="tag-description"]');
        this.saveButton = page.locator('[data-test-button="save"]');
        this.deleteButton = page.locator('[data-test-button="delete-tag"]');
        this.backLink = page.locator('[data-test-link="tags-back"]');

        this.deleteModal = page.locator('[data-test-modal="confirm-delete-tag"]');
        this.deleteModalPostsCount = this.deleteModal.locator('[data-test-text="posts-count"]');
        this.deleteModalConfirmButton = this.deleteModal.locator('[data-test-button="confirm"]');

        this.navMenuItem = page.locator('[data-test-nav="tags"]');
    }

    async gotoNew() {
        await this.page.goto('/ghost/#/tags/new');
    }

    async createTag(name: string, slug: string) {
        await this.fillTagName(name);
        await this.fillTagSlug(slug);
        await this.save();
    }

    async gotoTagBySlug(slug: string) {
        await this.page.goto(`/ghost/#/tags/${slug}`);
    }

    async fillTagName(name: string) {
        await this.nameInput.fill(name);
    }

    async fillTagSlug(slug: string) {
        await this.slugInput.fill(slug);
    }

    async fillTagDescription(description: string) {
        await this.descriptionInput.fill(description);
    }

    async save() {
        await this.saveButton.click();
    }

    async deleteTag() {
        await this.deleteButton.click();
    }

    async confirmDelete() {
        await this.deleteModalConfirmButton.click();
    }

    async goBackToTagsList() {
        await this.backLink.click();
    }
}

