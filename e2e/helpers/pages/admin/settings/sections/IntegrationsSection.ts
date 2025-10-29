import {BasePage} from '../../../BasePage';
import {Locator, Page} from '@playwright/test';

export class IntegrationsSection extends BasePage {
    readonly integrationsSection: Locator;
    readonly integrationsHeading: Locator;
    readonly integrationsDescription: Locator;
    readonly integrationsAddButton: Locator;

    constructor(page: Page) {
        super(page, 'ghost/#/settings/integrations');

        this.integrationsSection = page.getByTestId('integrations');
        this.integrationsHeading = page.getByRole('heading', {level: 5, name: 'Integrations'});
        this.integrationsDescription = page.getByText('Make Ghost work with apps and tools');
        this.integrationsAddButton = page.getByRole('button', {name: 'Add custom integration'});
    }
}
