import {AdminPage} from '@/admin-pages';
import {Locator, Page} from '@playwright/test';
import {automationListRow, automationsList, automationsListLoading, automationsPage} from '@tryghost/test-data/selectors/automations';

export class AutomationsPage extends AdminPage {
    readonly pageContent: Locator;

    readonly automationsList: Locator;
    readonly automationListRow: Locator;

    readonly loadingPlaceholder: Locator;

    constructor(page: Page) {
        super(page);

        this.pageUrl = '/ghost/#/automations';
        this.pageContent = page.getByTestId(automationsPage);
        this.automationsList = page.getByTestId(automationsList);
        this.automationListRow = this.automationsList.getByTestId(automationListRow);

        this.loadingPlaceholder = page.getByTestId(automationsListLoading);
    }

    title(name: string) {
        return this.pageContent.getByRole('heading', {name: name});
    }

    async waitForPageToFullyLoad() {
        await this.page.waitForURL(this.pageUrl);
        await this.pageContent.waitFor({state: 'visible'});
    }
}
