import {Locator, Page} from '@playwright/test';
import {AdminPage} from '../AdminPage';

export class TagsPage extends AdminPage {
    readonly pageContent: Locator;
    readonly tagList: Locator;
    readonly tagListRow: Locator;

    readonly tabs: Locator;
    readonly activeTab: Locator;
    readonly newTagButton: Locator;

    readonly emptyStateTitle: Locator;
    readonly emptyStateAction: Locator;

    readonly loadingPlaceholder: Locator;

    constructor(page: Page) {
        super(page);

        this.pageUrl = '/ghost/#/tags';
        this.pageContent = page.getByTestId('tags-page');
        this.tagList = page.getByTestId('tags-list');
        this.tagListRow = this.tagList.getByTestId('tag-list-row');

        this.tabs = page.getByTestId('tags-header-tabs');
        this.activeTab = this.tabs.locator('[data-state="active"]');
        this.newTagButton = page.getByRole('link', {name: 'New tag'});

        this.emptyStateTitle = this.pageContent.getByRole('heading', {name: 'Start organizing your content'});
        this.emptyStateAction = this.pageContent.getByRole('link', {name: 'Create a new tag'});

        this.loadingPlaceholder = page.getByTestId('loading-placeholder');
    }

    async selectTab(tabText: string) {
        const tab = this.tabs.getByRole('link', {name: tabText});
        await tab.click();
    }

    getRowByTitle(title: string) {
        return this.tagListRow.filter({has: this.page.getByRole('link', {name: title, exact: true})});
    }
}
