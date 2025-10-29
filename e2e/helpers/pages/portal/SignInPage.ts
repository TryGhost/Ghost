import {Locator, Page} from '@playwright/test';
import {PortalPage} from './PortalPage';

export class SignInPage extends PortalPage {
    readonly emailInput: Locator;
    readonly continueButton: Locator;
    readonly signinButton: Locator;
    readonly signupLink: Locator;

    constructor(page: Page) {
        super(page);

        this.emailInput = this.portalFrame.getByRole('textbox', {name: 'Email'});
        this.continueButton = this.portalFrame.getByRole('button', {name: 'Continue'});
        this.signinButton = this.portalFrame.getByRole('button', {name: 'Sign in'});
        this.signupLink = this.portalFrame.getByRole('button', {name: 'Sign up'});
    }
}