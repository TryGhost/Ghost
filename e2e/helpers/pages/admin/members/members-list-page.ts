import {AdminPage} from '@/admin-pages';
import {Download, Locator, Page} from '@playwright/test';
import {readFileSync} from 'node:fs';

export interface ExportedFile {
    suggestedFilename: string;
    content: string;
}

export interface MembersListSurface {
    goto(): Promise<unknown>;
    openActionsMenu(): Promise<void>;
    applyLabelFilter(labelName: string): Promise<void>;
    getVisibleMemberCount(): Promise<number>;
    exportMembers(): Promise<ExportedFile>;
}

export class MembersListPage extends AdminPage implements MembersListSurface {
    readonly memberRows: Locator;
    readonly searchInput: Locator;
    readonly actionsButton: Locator;
    readonly newMemberButton: Locator;
    readonly filterButton: Locator;
    readonly clearFiltersButton: Locator;
    readonly emptyState: Locator;
    readonly noResults: Locator;
    readonly showAllButton: Locator;

    constructor(page: Page) {
        super(page);
        this.pageUrl = '/ghost/#/members';

        this.memberRows = page.getByTestId('members-list-item');
        this.searchInput = page.getByTestId('members-search-input');
        this.actionsButton = page.getByTestId('members-actions');
        this.newMemberButton = page.getByRole('link', {name: 'New member'});
        this.filterButton = page.getByRole('button', {name: /^(Filter|Add filter)$/});
        this.clearFiltersButton = page.getByRole('button', {name: 'Clear'});
        this.emptyState = page.getByText('No members yet');
        this.noResults = page.getByText('No matching members found.');
        this.showAllButton = page.getByRole('button', {name: 'Show all members'});
    }

    getMemberByName(name: string): Locator {
        return this.memberRows.filter({
            has: this.page.getByRole('link', {name, exact: true})
        });
    }

    getMemberLinkByName(name: string): Locator {
        return this.getMemberByName(name).getByRole('link', {name, exact: true});
    }

    async openMemberByName(name: string): Promise<void> {
        await this.getMemberLinkByName(name).click();
    }

    async openActionsMenu(): Promise<void> {
        await this.actionsButton.click();
    }

    async applyLabelFilter(labelName: string): Promise<void> {
        await this.addSearchableFilter('Label', labelName, labelName);
    }

    async getVisibleMemberCount(): Promise<number> {
        return await this.memberRows.count();
    }

    async saveCurrentView(name: string): Promise<void> {
        await this.page.getByRole('button', {name: 'Save view'}).click();
        const dialog = this.page.getByRole('dialog');
        await dialog.waitFor({state: 'visible'});
        await dialog.getByRole('textbox', {name: 'View name'}).fill(name);
        await dialog.getByRole('button', {name: 'Save'}).click();
        await dialog.waitFor({state: 'hidden'});
    }

    getMenuItem(name: string | RegExp): Locator {
        return this.page.getByRole('menuitem', {name});
    }

    async addFilter(fieldName: string, value: string): Promise<void> {
        await this.filterButton.click();
        await this.page.getByRole('option', {name: fieldName, exact: true}).click();

        if (fieldName === 'Name' || fieldName === 'Email') {
            const placeholder = fieldName === 'Name' ? 'Enter name...' : 'Enter email...';
            await this.page.getByRole('textbox', {name: placeholder}).fill(value);
        } else {
            // For select-based filters (Label, Status, etc.)
            await this.page.getByRole('option', {name: value, exact: true}).click();
        }
    }

    async addSearchableFilter(fieldName: string, searchText: string, optionName: string): Promise<void> {
        await this.filterButton.click();
        await this.page.getByRole('option', {name: fieldName, exact: true}).click();
        await this.page.getByPlaceholder(`Search ${fieldName.toLowerCase()}...`).pressSequentially(searchText);
        await this.page.getByRole('option', {name: optionName}).click();
    }

    async addMultiselectFilter(fieldName: string, values: string[]): Promise<void> {
        await this.filterButton.click();
        await this.page.getByRole('option', {name: fieldName, exact: true}).click();

        // First selection: happens inside the add-filter popover (inline options).
        // Selecting an option creates the filter and closes the popover.
        await this.page.getByRole('option', {name: values[0], exact: true}).click();

        if (values.length > 1) {
            // Subsequent selections: click the filter value button to open
            // the filter's own combobox popover, then select additional options.
            const filterItem = this.getFilterItem(fieldName);
            await filterItem.getByRole('button', {name: values[0]}).click();

            for (let i = 1; i < values.length; i++) {
                await this.selectMultiselectOption(values[i]);
            }

            // Close the popover
            await this.page.keyboard.press('Escape');
        }
    }

    async selectMultiselectOption(value: string): Promise<void> {
        // Options may contain additional text (e.g. edit buttons with aria-labels),
        // so match by option role containing the value text rather than exact match.
        const escaped = value.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
        await this.page.getByRole('option', {name: new RegExp(String.raw`^${escaped}\b`)}).click();
    }

    async searchMultiselectOptions(query: string): Promise<void> {
        await this.page.locator('[cmdk-input]').fill(query);
    }

    get editLabelInput(): Locator {
        return this.page.locator('[data-edit-row] input');
    }

    getFilterItem(fieldName: string): Locator {
        return this.page.locator('[data-slot="filter-item"]').filter({hasText: fieldName});
    }

    async openFilterValue(fieldName: string): Promise<void> {
        const filterItem = this.getFilterItem(fieldName);
        // The filter item contains: field label, operator button, value button, remove button.
        // The value button is the one that's not the operator dropdown and not the remove button.
        await filterItem.locator('button:not([data-slot="filters-remove"])').last().click();
    }

    async exportMembers(): Promise<ExportedFile> {
        const download = await this.exportMembersData();
        const suggestedFilename = download.suggestedFilename();
        const downloadPath = await download.path();
        const downloadContent = readFileSync(downloadPath as string, 'utf-8');

        return {
            suggestedFilename,
            content: downloadContent
        };
    }

    async exportMembersData(): Promise<Download> {
        const downloadPromise = this.page.waitForEvent('download');
        await this.getMenuItem(/Export/).click();
        return await downloadPromise;
    }
}
