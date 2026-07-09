import {AdminPage} from '@/admin-pages';
import {Locator, Page} from '@playwright/test';

export class AutomationsPage extends AdminPage {
    readonly pageContent: Locator;

    readonly automationsList: Locator;
    readonly automationListRow: Locator;

    readonly loadingPlaceholder: Locator;

    constructor(page: Page) {
        super(page);

        this.pageUrl = '/ghost/#/automations';
        this.pageContent = page.getByTestId('automations-page');
        this.automationsList = page.getByTestId('automations-list');
        this.automationListRow = this.automationsList.getByTestId('automation-list-row');

        this.loadingPlaceholder = page.getByTestId('automations-list-loading');
    }

    title(name: string) {
        return this.pageContent.getByRole('heading', {name: name});
    }

    async waitForPageToFullyLoad() {
        await this.page.waitForURL(this.pageUrl);
        await this.pageContent.waitFor({state: 'visible'});
    }
}
