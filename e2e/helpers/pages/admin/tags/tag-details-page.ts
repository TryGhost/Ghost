import {AdminPage} from '@/admin-pages';
import {Locator, Page} from '@playwright/test';

export class TagDetailsPage extends AdminPage {
    readonly nameInput: Locator;
    readonly slugInput: Locator;
    readonly descriptionInput: Locator;
    readonly colorInput: Locator;
    readonly saveButton: Locator;
    readonly saveButtonSuccess: Locator;
    readonly deleteButton: Locator;
    readonly backLink: Locator;

    readonly metaDataExpandButton: Locator;
    readonly metaTitleInput: Locator;
    readonly metaDescriptionInput: Locator;
    readonly canonicalUrlInput: Locator;

    readonly unsavedChangesModal: Locator;
    readonly unsavedChangesStayButton: Locator;
    readonly unsavedChangesLeaveButton: Locator;

    constructor(page: Page) {
        super(page);

        this.nameInput = page.getByRole('textbox', {name: 'Name'});
        this.slugInput = page.getByRole('textbox', {name: 'Slug'});
        this.descriptionInput = page.getByRole('textbox', {name: 'Description'});
        this.colorInput = page.getByRole('textbox', {name: 'Accent color hex value'});
        this.saveButton = page.getByRole('button', {name: 'Save'});
        this.saveButtonSuccess = page.getByRole('button', {name: 'Saved'});
        this.deleteButton = page.getByRole('button', {name: 'Delete tag'});

        this.backLink = page.getByTestId('tags-back');

        this.metaDataExpandButton = page.getByTestId('expand-meta-data');
        this.metaTitleInput = page.getByRole('textbox', {name: 'Meta title'});
        this.metaDescriptionInput = page.getByRole('textbox', {name: 'Meta description'});
        this.canonicalUrlInput = page.getByRole('textbox', {name: 'Canonical URL'});

        this.unsavedChangesModal = page.getByTestId('unsaved-changes-modal');
        this.unsavedChangesStayButton = this.unsavedChangesModal.getByRole('button', {name: 'Stay'});
        this.unsavedChangesLeaveButton = this.unsavedChangesModal.getByRole('button', {name: 'Leave'});
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

    async expandMetaData() {
        await this.metaDataExpandButton.click();
    }

    async save() {
        await this.saveButton.click();
        await this.saveButtonSuccess.waitFor({state: 'visible'});
    }

    async goBackToTagsList() {
        await this.backLink.click();
    }
}
