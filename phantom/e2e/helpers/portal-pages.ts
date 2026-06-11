// Slim port of /e2e/helpers/pages/portal and the portal-aware public home
// page — selectors identical to upstream.
import type {FrameLocator, Locator, Page} from '@playwright/test';
import {BasePage} from './pages';

export class PortalPage extends BasePage {
    readonly portalFrame: FrameLocator;
    private readonly frameSelector = '[data-testid="portal-popup-frame"]';
    protected readonly portalPopupFrame: Locator;
    readonly closeButton: Locator;

    constructor(page: Page) {
        super(page);
        this.portalFrame = page.frameLocator(this.frameSelector);
        this.portalPopupFrame = page.locator(this.frameSelector);

        this.closeButton = this.portalFrame.getByTestId('close-popup');
    }

    async waitForPortalToOpen(): Promise<void> {
        await this.portalPopupFrame.waitFor({state: 'visible'});
    }

    async closePortal(): Promise<void> {
        await this.closeButton.click();
        await this.portalPopupFrame.waitFor({state: 'hidden', timeout: 2000});
    }
}

export class SignUpPage extends PortalPage {
    readonly emailInput: Locator;
    readonly nameInput: Locator;
    readonly signupButton: Locator;
    readonly signinLink: Locator;

    constructor(page: Page) {
        super(page);

        this.nameInput = this.portalFrame.getByRole('textbox', {name: 'Name'});
        this.emailInput = this.portalFrame.getByRole('textbox', {name: 'Email'});
        this.signupButton = this.portalFrame.getByRole('button', {name: 'Sign up'});
        this.signinLink = this.portalFrame.getByRole('button', {name: 'Sign in'});
    }

    async fillAndSubmit(email: string, name?: string): Promise<void> {
        if (name) {
            await this.nameInput.fill(name);
        }
        await this.emailInput.fill(email);
        await this.signupButton.click();
    }
}

export class SignUpSuccessPage extends PortalPage {
    readonly successMessage: Locator;

    constructor(page: Page) {
        super(page);
        this.successMessage = this.portalFrame.getByText('To complete signup, click the confirmation link in your inbox');
    }

    async waitForSignUpSuccess(): Promise<void> {
        await this.successMessage.waitFor({state: 'visible'});
    }
}

export class PortalHomePage extends BasePage {
    readonly title: Locator;
    readonly accountButton: Locator;
    readonly portalRoot: Locator;
    readonly portalIframe: Locator;
    readonly portalScript: Locator;
    private readonly subscribeLink: Locator;

    constructor(page: Page) {
        super(page, '/');

        this.title = page.getByRole('heading', {level: 1});
        this.accountButton = page.getByRole('link', {name: 'Account'});
        this.portalRoot = page.getByTestId('portal-root');
        this.portalIframe = page.locator('iframe[title="portal-popup"]');
        this.portalScript = page.locator('script[data-ghost][data-key][data-api]');
        this.subscribeLink = page.locator('a[href="#/portal/signup"]').first();
    }

    async waitUntilLoaded(): Promise<void> {
        await this.accountButton.waitFor({state: 'visible'});
        await this.portalRoot.waitFor({state: 'attached'});
    }

    // Portal's hashchange listener is only ready after async init; retry the
    // click until the popup opens (mirrors upstream's PortalSection helper).
    async openPortal(): Promise<void> {
        await this.portalScript.waitFor({state: 'attached'});
        await this.portalRoot.waitFor({state: 'attached'});

        for (let attempt = 0; attempt < 5; attempt++) {
            await this.subscribeLink.click();
            try {
                await this.portalIframe.waitFor({state: 'visible', timeout: 1000});
                return;
            } catch {
                // Keep retrying until Portal's hashchange listener is ready.
            }
        }

        throw new Error('Portal popup did not open');
    }
}
