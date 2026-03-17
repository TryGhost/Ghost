import {Locator, Page} from '@playwright/test';

export class MembersImportModal {
    private readonly page: Page;

    readonly fileInput: Locator;
    readonly importButton: Locator;
    readonly importHeading: Locator;
    readonly closeButton: Locator;

    constructor(page: Page) {
        this.page = page;
        this.fileInput = page.locator('input[type="file"]');
        this.importButton = page.getByRole('button', {name: /import \d+ members?/i});
        this.importHeading = page.getByRole('heading', {name: /import (in progress|complete)/i});
        this.closeButton = page.getByRole('button', {name: /got it|view members/i});
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
