import {Locator, Page} from '@playwright/test';

export class CustomViewModal {
    private readonly page: Page;
    public readonly modal: Locator;
    public readonly nameInput: Locator;
    public readonly nameError: Locator;
    public readonly saveButton: Locator;
    public readonly deleteButton: Locator;
    public readonly cancelButton: Locator;

    constructor(page: Page) {
        this.page = page;
        this.modal = page.getByRole('dialog');
        this.nameInput = page.getByLabel('View name');
        this.nameError = page.locator('[data-test-error="custom-view-name"]');
        this.saveButton = this.modal.getByRole('button', {name: 'Save'});
        this.deleteButton = this.modal.getByRole('button', {name: 'Delete'});
        this.cancelButton = this.modal.getByRole('button', {name: 'Cancel'});
    }

    async waitForModal(): Promise<void> {
        await this.modal.waitFor({state: 'visible'});
    }

    async enterName(name: string): Promise<void> {
        await this.nameInput.fill(name);
    }

    async selectColor(color: string): Promise<void> {
        await this.page.getByLabel(color).click();
    }

    async save(): Promise<void> {
        await this.saveButton.click();
        await this.modal.waitFor({state: 'hidden'});
    }

    async delete(): Promise<void> {
        await this.deleteButton.click();
        await this.modal.waitFor({state: 'hidden'});
    }

    async cancel(): Promise<void> {
        await this.cancelButton.click();
        await this.modal.waitFor({state: 'hidden'});
    }
}
