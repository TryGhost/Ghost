import {Locator, Page} from '@playwright/test';
import {AdminPage} from './AdminPage';

// TODO: Remove this when start using the verification page
// eslint-disable-next-line @typescript-eslint/no-unused-vars
class LoginVerifyPage extends AdminPage{
    readonly twoFactorTokenField: Locator;
    readonly twoFactorVerifyButton: Locator;
    readonly resendTwoFactorCodeButton:Locator;
    readonly sentTwoFactorCodeButton:Locator;

    constructor(page: Page) {
        super(page);

        this.twoFactorTokenField = page.getByLabel('Verification code');
        this.twoFactorVerifyButton = page.getByRole('button', {name: 'Verify'});
        this.resendTwoFactorCodeButton = page.getByRole('button', {name: 'Resend'});
        this.sentTwoFactorCodeButton = page.getByRole('button', {name: 'Sent'});
    };
}
