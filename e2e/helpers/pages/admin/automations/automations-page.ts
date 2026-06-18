import {AdminPage} from '@/admin-pages';
import {Locator, Page} from '@playwright/test';

export class AutomationsPage extends AdminPage {
    readonly pageTitle: Locator;
    readonly automationsList: Locator;
    readonly freeWelcomeAutomationLink: Locator;

    constructor(page: Page) {
        super(page);
        this.pageUrl = '/ghost/#/automations';
        this.pageTitle = page.getByRole('heading', {name: 'Automations'});
        this.automationsList = page.getByTestId('automations-list');
        this.freeWelcomeAutomationLink = this.automationsList.getByRole('link', {name: 'Welcome Email (Free)'});
    }

    async waitUntilLoaded(): Promise<void> {
        await this.pageTitle.waitFor({state: 'visible'});
        await this.automationsList.waitFor({state: 'visible'});
    }

    async openFreeWelcomeAutomation(): Promise<void> {
        await this.goto();
        await this.waitUntilLoaded();
        await this.freeWelcomeAutomationLink.click();
    }
}
