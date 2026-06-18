import {AdminPage} from '@/admin-pages';
import {Locator, Page} from '@playwright/test';

export class AutomationsPage extends AdminPage {
    readonly pageTitle: Locator;
    readonly automationsList: Locator;

    constructor(page: Page) {
        super(page);
        this.pageUrl = '/ghost/#/automations';
        this.pageTitle = page.getByRole('heading', {name: 'Automations'});
        this.automationsList = page.getByTestId('automations-list');
    }

    async waitUntilLoaded(): Promise<void> {
        await this.pageTitle.waitFor({state: 'visible'});
        await this.automationsList.waitFor({state: 'visible'});
    }
}
