import {AdminPage} from '../AdminPage';
import {Download, Locator, Page} from '@playwright/test';
import {readFileSync} from 'fs';

export interface ExportedFile {
    suggestedFilename: string;
    content: string
}

export class MembersPage extends AdminPage {
    readonly newMemberButton: Locator;
    readonly memberListItems: Locator;
    readonly emptyStateHeading: Locator;
    readonly membersActionsButton: Locator;
    readonly exportMembersButton: Locator;
    readonly filterActionsButton: Locator;
    readonly filterSelect: Locator;
    readonly applyFilterButton: Locator;

    constructor(page: Page) {
        super(page);
        this.pageUrl = '/ghost/#/members';

        this.membersActionsButton = page.getByTestId('members-actions');
        this.newMemberButton = page.getByRole('link', {name: 'New member'});
        this.exportMembersButton = page.getByTestId('export-members');

        this.memberListItems = page.getByTestId('members-list-item');
        this.emptyStateHeading = page.getByRole('heading', {name: 'Start building your audience'});

        this.filterActionsButton = page.getByTestId('members-filter-actions');
        this.filterSelect = page.getByTestId('members-filter');
        this.applyFilterButton = page.getByTestId('members-apply-filter');
    }

    async clickMemberByEmail(email: string): Promise<void> {
        await this.memberListItems.filter({hasText: email}).click();
    }

    getMemberByName(name: string): Locator {
        return this.memberListItems.filter({hasText: name});
    }

    getMemberEmail(name: string): Locator {
        return this.memberListItems.filter({hasText: name}).getByRole('paragraph');
    }

    async getMemberCount(): Promise<number> {
        return await this.memberListItems.count();
    }

    async applyLabelFilter(labelName: string): Promise<void> {
        await this.filterActionsButton.click();
        await this.filterSelect.selectOption('label');

        await this.addLabelToLabelFilter(labelName);

        await this.applyFilterButton.click();
    }

    async addLabelToLabelFilter(labelName: string) {
        await this.page.getByTestId('token-input-search').fill(labelName);
        await this.page.keyboard.press('Tab');
    }

    async exportMembers(): Promise<ExportedFile> {
        const download = await this.exportMembersData();
        const suggestedFilename = download.suggestedFilename();

        const downloadPath = await download.path();
        const downloadContent = readFileSync(downloadPath as string, 'utf-8');

        return {
            suggestedFilename: suggestedFilename,
            content: downloadContent
        };
    }

    async exportMembersData(): Promise<Download> {
        await this.exportMembersButton.click();
        return await this.page.waitForEvent('download');
    }
}
