import {AdminPage} from '@/admin-pages';
import {Download, Locator, Page} from '@playwright/test';
import {readFileSync} from 'node:fs';

interface ExportedFile {
    suggestedFilename: string;
    content: string;
}

export class MembersForwardPage extends AdminPage {
    readonly membersList: Locator;
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
        this.pageUrl = '/ghost/#/members-forward';

        this.membersList = page.getByTestId('members-list');
        this.memberRows = page.getByTestId('members-list-item');
        this.searchInput = page.getByLabel('Search members', {exact: true});
        this.actionsButton = page.getByTestId('members-actions');
        this.newMemberButton = page.getByRole('link', {name: 'New member'});
        this.filterButton = page.getByRole('button', {name: /^(Filter|Add filter)$/});
        this.clearFiltersButton = page.getByRole('button', {name: 'Clear'});
        this.emptyState = page.getByText('No members yet');
        this.noResults = page.getByText('No matching members found.');
        this.showAllButton = page.getByRole('button', {name: 'Show all members'});
    }

    getMemberByName(name: string): Locator {
        return this.memberRows.filter({hasText: name});
    }

    async openActionsMenu(): Promise<void> {
        await this.actionsButton.click();
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
