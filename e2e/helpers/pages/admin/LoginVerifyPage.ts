import {AdminPage} from './AdminPage';
import {Locator, Page} from '@playwright/test';

export class LoginVerifyPage extends AdminPage{
    readonly twoFactorTokenField: Locator;
    readonly twoFactorVerifyButton: Locator;
    readonly resendTwoFactorCodeButton:Locator;
    readonly sentTwoFactorCodeButton:Locator;

    constructor(page: Page) {
        super(page);

        this.twoFactorTokenField = page.getByRole('textbox', {name: 'Verification code'});
        this.twoFactorVerifyButton = page.getByRole('button', {name: 'Verify'});
        this.resendTwoFactorCodeButton = page.getByRole('button', {name: 'Resend'});
        this.sentTwoFactorCodeButton = page.getByRole('button', {name: 'Sent'});
    };
}
