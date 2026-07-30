import {AdminPage} from '@/admin-pages';
import {Locator, Page} from '@playwright/test';

export class TagDetailsPage extends AdminPage {
    readonly nameInput: Locator;
    readonly slugInput: Locator;
    readonly descriptionInput: Locator;
    readonly saveButton: Locator;
    readonly saveButtonSuccess: Locator;
    readonly deleteButton: Locator;
    readonly backLink: Locator;

    constructor(page: Page) {
        super(page);

        this.nameInput = page.getByRole('textbox', {name: 'Name'});
        this.slugInput = page.getByRole('textbox', {name: 'Slug'});
        this.descriptionInput = page.getByRole('textbox', {name: 'Description'});
        this.saveButton = page.getByRole('button', {name: 'Save'});
        this.saveButtonSuccess = page.getByRole('button', {name: 'Saved'});
        this.deleteButton = page.getByRole('button', {name: 'Delete tag'});

        // Both the Ember and React trees can be in the DOM at once, and the
        // React screen reuses the same data-test attribute — the visibility
        // filter picks whichever implementation is active.
        this.backLink = page.locator('[data-test-link="tags-back"]').filter({visible: true});
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
        await this.saveButtonSuccess.waitFor({state: 'visible'});
    }

    async goBackToTagsList() {
        await this.backLink.click();
    }
}
