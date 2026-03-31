import {AdminPage} from '@/admin-pages';
import {BasePage} from '@/helpers/pages';
import {Download, JSHandle, Locator, Page} from '@playwright/test';
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
        await this.selectLabelOption(labelName);

        await this.confirmAddLabelButton.click();
        await this.labelAdded.waitFor({state: 'visible'});
    }

    async removeLabelFromSelectedMembers(labelName: string): Promise<void> {
        await this.removeLabelForSelectedMembersButton.click();
        await this.selectLabel.waitFor({state: 'visible'});
        await this.selectLabelOption(labelName);

        await this.confirmRemoveLabelButton.click();
        await this.labelRemoved.waitFor({state: 'visible'});
    }

    getSuccessMessage(): Locator {
        return this.page.getByTestId('label-success-message');
    }

    private async selectLabelOption(labelName: string): Promise<void> {
        await this.selectLabel.waitFor({state: 'visible'});
        await this.selectLabel.click();

        const dropdown = this.page.locator('.ember-power-select-dropdown').last();
        await dropdown.waitFor({state: 'visible'});

        const searchInput = dropdown.locator('.ember-power-select-search input');
        await searchInput.waitFor({state: 'visible'});
        await searchInput.fill(labelName);

        const option = dropdown.getByRole('option', {name: labelName, exact: true});
        await option.waitFor({state: 'visible'});
        await option.click();
    }
}

export class MembersPage extends AdminPage {
    readonly newMemberButton: Locator;
    public readonly loadMoreButton: Locator;
    public readonly membersListScrollRoot: Locator;
    readonly memberListItems: Locator;
    readonly emptyStateHeading: Locator;

    readonly membersActionsButton: Locator;
    readonly exportMembersButton: Locator;

    readonly filterSection: FilterSection;
    readonly settingsSection: SettingsSection;

    constructor(page: Page, {route = 'members'}: {route?: string} = {}) {
        super(page);
        this.pageUrl = `/ghost/#/${route}`;

        this.membersActionsButton = page.getByTestId('members-actions');
        this.newMemberButton = page.getByRole('link', {name: 'New member'});
        this.exportMembersButton = page.getByTestId('export-members');

        this.loadMoreButton = page.getByRole('button', {name: 'Load more'});
        this.membersListScrollRoot = page.getByTestId('members-list-scroll-root');
        this.memberListItems = page.getByTestId('members-list-item');
        this.emptyStateHeading = page.getByRole('heading', {name: 'Start building your audience'});

        this.filterSection = new FilterSection(page);
        this.settingsSection = new SettingsSection(page);
    }

    async clickMemberByEmail(email: string): Promise<void> {
        await this.memberListItems.filter({hasText: email}).click();
    }

    async getMaxRenderedIndex(): Promise<number> {
        return await this.memberListItems.evaluateAll((rows) => {
            return rows.reduce((maxIndex, row) => {
                return Math.max(maxIndex, Number(row.getAttribute('data-index') || '-1'));
            }, -1);
        });
    }

    private async getMembersScrollParentHandle(): Promise<JSHandle<HTMLElement>> {
        return await this.membersListScrollRoot.evaluateHandle((element) => {
            let node: Node | null = element;

            while (node) {
                if (node instanceof HTMLElement) {
                    const overflowY = window.getComputedStyle(node).overflowY;
                    const isScrollable = overflowY !== 'visible' && overflowY !== 'hidden';

                    if (isScrollable && node.scrollHeight >= node.clientHeight) {
                        return node;
                    }
                }

                node = node.parentNode;
            }

            return document.body;
        }) as JSHandle<HTMLElement>;
    }

    async getScrollParentScrollTop(): Promise<number> {
        const scrollParent = await this.getMembersScrollParentHandle();

        try {
            return await scrollParent.evaluate(element => element.scrollTop);
        } finally {
            await scrollParent.dispose();
        }
    }

    async scrollScrollParentBy(deltaY: number): Promise<void> {
        const scrollParent = await this.getMembersScrollParentHandle();

        try {
            await scrollParent.evaluate((element, pixels) => {
                element.scrollBy(0, pixels);
            }, deltaY);
        } finally {
            await scrollParent.dispose();
        }
    }

    async scrollUntilMaxRenderedIndexAtLeast(targetIndex: number): Promise<number> {
        let maxRenderedIndex = await this.getMaxRenderedIndex();

        for (let i = 0; i < 30 && maxRenderedIndex < targetIndex; i += 1) {
            await this.scrollScrollParentBy(4000);
            await this.page.waitForFunction((previousMaxIndex) => {
                const rows = Array.from(document.querySelectorAll('[data-testid="members-list-item"]'));

                return rows.some(row => Number(row.getAttribute('data-index') || '-1') > previousMaxIndex);
            }, maxRenderedIndex);
            maxRenderedIndex = await this.getMaxRenderedIndex();
        }

        return maxRenderedIndex;
    }

    getMemberListItemByIndex(index: number): Locator {
        return this.page.locator(`[data-testid="members-list-item"][data-index="${index}"]`);
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
