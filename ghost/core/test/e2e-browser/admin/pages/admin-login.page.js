const AdminPage = require('./admin-page');

class AdminLoginPage extends AdminPage {
    #usernameField = null;
    #passwordField = null;
    #signInButton = null;

    #twoFactorTokenField = null;
    #twoFactorVerifyButton = null;
    #resendTwoFactorCodeButton = null;
    #sentTwoFactorCodeButton = null;

    /**
     * @param {import('@playwright/test').Page} page - playwright page object
     */
    constructor(page) {
        super(page, '/ghost');

        this.#usernameField = page.getByLabel('Email address');
        this.#passwordField = page.getByLabel('Password');
        this.#signInButton = page.getByRole('button', {name: 'Sign in'});

        this.#twoFactorTokenField = page.getByLabel('Verification code');
        this.#twoFactorVerifyButton = page.getByRole('button', {name: 'Verify'});
        this.#resendTwoFactorCodeButton = page.getByRole('button', {name: 'Resend'});
        this.#sentTwoFactorCodeButton = page.getByRole('button', {name: 'Sent'});
    }

    async signIn(usernameField, passwordField) {
        await this.#usernameField.fill(usernameField);
        await this.#passwordField.fill(passwordField);
        await this.#signInButton.click();
    }

    async verifyTwoFactorToken(token) {
        await this.#twoFactorTokenField.fill(token);
        await this.#twoFactorVerifyButton.click();
    }

    async resendTwoFactorToken() {
        await this.#resendTwoFactorCodeButton.click();
    }

    get sentTwoFactorCodeButton() {
        return this.#sentTwoFactorCodeButton;
    }
}

module.exports = AdminLoginPage;
