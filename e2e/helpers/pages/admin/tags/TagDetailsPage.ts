import {Locator, Page} from '@playwright/test';
import {AdminPage} from '../AdminPage';

export class TagDetailsPage extends AdminPage {
    readonly nameInput: Locator;
    readonly slugInput: Locator;
    readonly descriptionInput: Locator;
    readonly saveButton: Locator;
    readonly deleteButton: Locator;
    readonly backLink: Locator;
    readonly navMenuItem: Locator;

    constructor(page: Page) {
        super(page);

        this.nameInput = page.locator('[data-test-input="tag-name"]');
        this.slugInput = page.locator('[data-test-input="tag-slug"]');
        this.descriptionInput = page.locator('[data-test-input="tag-description"]');
        this.saveButton = page.locator('[data-test-button="save"]');
        this.deleteButton = page.locator('[data-test-button="delete-tag"]');
        this.backLink = page.locator('[data-test-link="tags-back"]');

        this.navMenuItem = page.locator('[data-test-nav="tags"]');
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

    async goBackToTagsList() {
        await this.backLink.click();
    }
}

