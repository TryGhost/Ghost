import {Locator, Page} from '@playwright/test';
import {PortalPage} from './portal-page';

export class SupportSuccessPage extends PortalPage {
    readonly title: Locator;
    readonly signUpButton: Locator;

    constructor(page: Page) {
        super(page);

        this.title = this.portalFrame.getByRole('heading', {name: 'Thank you for your support'});
        this.signUpButton = this.portalFrame.getByRole('button', {name: 'Sign up'});
    }
}
