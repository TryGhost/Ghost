import {Locator, Page} from '@playwright/test';

export class MembersImportModal {
    private readonly page: Page;

    readonly fileInput: Locator;
    readonly importButton: Locator;
    readonly importHeading: Locator;
    readonly closeButton: Locator;

    constructor(page: Page) {
        this.page = page;
        this.fileInput = page.locator('[data-test-fileinput="members-csv"] input[type="file"]').first();
        this.importButton = page.locator('[data-test-button="perform-import"]');
        this.importHeading = page.locator('[data-test-modal="import-members"]').getByRole('heading', {name: /import (in progress|complete)/i});
        this.closeButton = page.locator('[data-test-button="close-import-members"]');
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
