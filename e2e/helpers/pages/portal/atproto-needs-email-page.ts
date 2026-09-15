/* eslint-disable ghost/sort-imports-es6-autofix/sort-imports-es6 */
import {Locator, Page} from '@playwright/test';
import {PortalPage} from './portal-page';

export class AtprotoNeedsEmailPage extends PortalPage {
    readonly heading: Locator;
    readonly emailInput: Locator;
    readonly continueButton: Locator;
    readonly successHeading: Locator;

    constructor(page: Page) {
        super(page);

        this.heading = this.portalFrame.getByRole('heading', {name: 'Complete your sign up'});
        this.emailInput = this.portalFrame.locator('input[type="email"]');
        this.continueButton = this.portalFrame.getByRole('button', {name: 'Continue'});
        this.successHeading = this.portalFrame.getByRole('heading', {name: 'Check your email'});
    }
}