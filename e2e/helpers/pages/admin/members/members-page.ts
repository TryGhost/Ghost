import {AdminPage} from '@/admin-pages';
import {BasePage} from '@/helpers/pages';
import {Download, Locator, Page} from '@playwright/test';
import {readFileSync} from 'fs';

export interface ExportedFile {
    suggestedFilename: string;
    content: string
}

class FilterSection extends BasePage {
    readonly actionsButton: Locator;
    readonly applyFilterButton: Locator;

    readonly selectType: Locator;
    readonly input: Locator;

    constructor(page: Page) {
        super(page);

        this.actionsButton = page.getByTestId('members-filter-actions');
        this.applyFilterButton = page.getByTestId('members-apply-filter');
        this.selectType = page.getByTestId('members-filter');
        this.input = page.getByTestId('token-input-search');
    }

    async applyLabel(labelName: string): Promise<void> {
        await this.actionsButton.click();
        await this.selectType.selectOption('label');

        await this.addLabelToLabelFilter(labelName);

        await this.applyFilterButton.click();
    }

    private async addLabelToLabelFilter(labelName: string) {
        await this.input.fill(labelName);
        await this.page.keyboard.press('Tab');
    }
}

class SettingsSection extends BasePage {
    readonly addLabelForSelectedMembersButton: Locator;
    readonly removeLabelForSelectedMembersButton: Locator;
    readonly selectLabel: Locator;
    readonly confirmAddLabelButton: Locator;
    readonly confirmRemoveLabelButton: Locator;
    readonly closeModalButton: Locator;

    private readonly labelRemoved: Locator;
    private readonly labelAdded: Locator;

    constructor(page: Page) {
        super(page);

        this.addLabelForSelectedMembersButton = page.getByTestId('add-label-selected');
        this.removeLabelForSelectedMembersButton = page.getByTestId('remove-label-selected');

        this.selectLabel = page.getByTestId('label-select');
        this.confirmAddLabelButton = page.getByTestId('confirm');
        this.confirmRemoveLabelButton = page.getByTestId('confirm');
        this.closeModalButton = page.getByTestId('close-modal');

        this.labelAdded = page.getByTestId('add-label-complete');
        this.labelRemoved = page.getByTestId('remove-label-complete');
    }

    async addLabelToSelectedMembers(labelName: string): Promise<void> {
        await this.addLabelForSelectedMembersButton.click();
        await this.selectLabel.waitFor({state: 'visible'});
        await this.selectLabel.selectOption({label: labelName});

        await this.confirmAddLabelButton.click();
        await this.labelAdded.waitFor({state: 'visible'});
    }

    async removeLabelFromSelectedMembers(labelName: string): Promise<void> {
        await this.removeLabelForSelectedMembersButton.click();
        await this.selectLabel.selectOption({label: labelName});

        await this.confirmRemoveLabelButton.click();
        await this.labelRemoved.waitFor({state: 'visible'});
    }

    getSuccessMessage(): Locator {
        return this.page.getByTestId('label-success-message');
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
        const downloadPromise = this.page.waitForEvent('download');
        await this.exportMembersButton.click();
        return await downloadPromise;
    }
}
