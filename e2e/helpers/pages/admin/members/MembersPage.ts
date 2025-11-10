import {AdminPage} from '../AdminPage';
import {BasePage} from '../../BasePage';
import {Download, Locator, Page} from '@playwright/test';
import {readFileSync} from 'fs';

export interface ExportedFile {
    suggestedFilename: string;
    content: string
}

class FilterSection extends BasePage {
    readonly filterActionsButton: Locator;
    readonly filterSelect: Locator;
    readonly applyFilterButton: Locator;
    readonly filterInput: Locator;

    constructor(page: Page) {
        super(page);

        this.filterActionsButton = page.getByTestId('members-filter-actions');
        this.filterSelect = page.getByTestId('members-filter');
        this.filterInput = page.getByTestId('token-input-search');
        this.applyFilterButton = page.getByTestId('members-apply-filter');
    }

    async applyLabel(labelName: string): Promise<void> {
        await this.filterActionsButton.click();
        await this.filterSelect.selectOption('label');

        await this.addLabelToLabelFilter(labelName);

        await this.applyFilterButton.click();
    }

    private async addLabelToLabelFilter(labelName: string) {
        await this.filterInput.fill(labelName);
        await this.page.keyboard.press('Tab');
    }
}

class SettingsSection extends BasePage {
    readonly addLabelButton: Locator;
    readonly removeLabelButton: Locator;

    readonly confirmButton: Locator;
    readonly closeModalButton: Locator;

    constructor(page: Page) {
        super(page);

        this.addLabelButton = page.getByTestId('add-label-selected');
        this.removeLabelButton = page.getByTestId('remove-label-selected');
        this.confirmButton = page.getByTestId('confirm');
        this.closeModalButton = page.getByTestId('close-modal');
    }

    async addLabelOnSelectedMembers(labelName: string): Promise<void> {
        await this.addLabelButton.click();
        await this.page.locator('[data-test-state="add-label-unconfirmed"] select').selectOption({label: labelName});
        await this.confirmButton.click();
        await this.page.locator('[data-test-state="add-complete"]').waitFor({state: 'visible'});
    }

    async removeLabelOnSelectedMembers(labelName: string): Promise<void> {
        await this.removeLabelButton.click();
        await this.page.locator('[data-test-state="remove-label-unconfirmed"] select').selectOption({label: labelName});
        await this.confirmButton.click();
        await this.page.locator('[data-test-state="remove-complete"]').waitFor({state: 'visible'});
    }

    getSuccessMessage(): Locator {
        return this.page.locator('[data-test-state="add-complete"] p, [data-test-state="remove-complete"] p');
    }
}

export class MembersPage extends AdminPage {
    readonly newMemberButton: Locator;
    readonly memberListItems: Locator;
    readonly emptyStateHeading: Locator;

    readonly membersActionsButton: Locator;
    readonly exportMembersButton: Locator;

    readonly filterSection: FilterSection;
    readonly settingsSection: SettingsSection;

    constructor(page: Page) {
        super(page);
        this.pageUrl = '/ghost/#/members';

        this.membersActionsButton = page.getByTestId('members-actions');
        this.newMemberButton = page.getByRole('link', {name: 'New member'});
        this.exportMembersButton = page.getByTestId('export-members');

        this.memberListItems = page.getByTestId('members-list-item');
        this.emptyStateHeading = page.getByRole('heading', {name: 'Start building your audience'});

        this.filterSection = new FilterSection(page);
        this.settingsSection = new SettingsSection(page);
    }

    async clickMemberByEmail(email: string): Promise<void> {
        await this.memberListItems.filter({hasText: email}).click();
    }

    getMemberByName(name: string): Locator {
        return this.memberListItems.filter({hasText: name});
    }

    getMemberEmail(memberName: string): Locator {
        return this.memberListItems.filter({hasText: memberName}).getByRole('paragraph');
    }

    async getMemberCount(): Promise<number> {
        return await this.memberListItems.count();
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
