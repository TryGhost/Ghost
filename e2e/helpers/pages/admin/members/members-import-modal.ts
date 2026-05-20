import {Locator, Page} from '@playwright/test';

export class MembersImportModal {
    private readonly page: Page;
    private readonly dialog: Locator;

    readonly fileInput: Locator;
    readonly importButton: Locator;
    readonly importHeading: Locator;
    readonly closeButton: Locator;

    constructor(page: Page) {
        this.page = page;
        this.dialog = page.getByRole('dialog');
        this.fileInput = this.dialog.locator('input[type="file"]').first();
        this.importButton = this.dialog.getByRole('button', {name: /^Import(?: \d[\d,]* members?)?$/});
        this.importHeading = this.dialog.getByRole('heading', {name: /import (in progress|complete)/i});
        this.closeButton = this.dialog.getByRole('button', {name: /^(View members|Got it)$/});
    }

    getMappingRow(fieldName: string): Locator {
        return this.page.getByRole('row').filter({
            has: this.page.getByRole('cell', {name: fieldName, exact: true})
        });
    }

    getMappingValue(fieldName: string): Locator {
        return this.getMappingRow(fieldName).getByRole('combobox');
    }
}
