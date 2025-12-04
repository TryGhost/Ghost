import {BasePage} from '@/helpers/pages';
import {Locator, Page} from '@playwright/test';

export class MemberWelcomeEmailsSection extends BasePage {
    readonly section: Locator;
    readonly freeWelcomeEmailToggle: Locator;
    readonly paidWelcomeEmailToggle: Locator;
    readonly freeWelcomeEmailEditButton: Locator;
    readonly paidWelcomeEmailEditButton: Locator;

    constructor(page: Page) {
        super(page, '/ghost/#/settings/memberemails');
        this.section = page.getByTestId('memberemails');
        this.freeWelcomeEmailToggle = this.section.getByLabel('Free members welcome email');
        this.paidWelcomeEmailToggle = this.section.getByLabel('Paid members welcome email');
        this.freeWelcomeEmailEditButton = page.getByTestId('free-welcome-email-edit-button');
        this.paidWelcomeEmailEditButton = page.getByTestId('paid-welcome-email-edit-button');
    }

    async enableFreeWelcomeEmail(): Promise<void> {
        if (!await this.isFreeWelcomeEmailEnabled()) {
            await this.freeWelcomeEmailToggle.click();
            await this.waitForFreeToggle(true);
        }
    }

    async disableFreeWelcomeEmail(): Promise<void> {
        if (await this.isFreeWelcomeEmailEnabled()) {
            await this.freeWelcomeEmailToggle.click();
            await this.waitForFreeToggle(false);
        }
    }

    async enablePaidWelcomeEmail(): Promise<void> {
        if (!await this.isPaidWelcomeEmailEnabled()) {
            await this.paidWelcomeEmailToggle.click();
            await this.waitForPaidToggle(true);
        }
    }

    async disablePaidWelcomeEmail(): Promise<void> {
        if (await this.isPaidWelcomeEmailEnabled()) {
            await this.paidWelcomeEmailToggle.click();
            await this.waitForPaidToggle(false);
        }
    }

    async isFreeWelcomeEmailEnabled(): Promise<boolean> {
        const ariaChecked = await this.freeWelcomeEmailToggle.getAttribute('aria-checked');
        return ariaChecked === 'true';
    }

    async isPaidWelcomeEmailEnabled(): Promise<boolean> {
        const ariaChecked = await this.paidWelcomeEmailToggle.getAttribute('aria-checked');
        return ariaChecked === 'true';
    }

    private async waitForFreeToggle(checked: boolean): Promise<void> {
        const toggle = this.section.getByLabel('Free members welcome email').and(this.page.getByRole('switch', {checked}));
        await toggle.waitFor({state: 'visible'});
    }

    private async waitForPaidToggle(checked: boolean): Promise<void> {
        const toggle = this.section.getByLabel('Paid members welcome email').and(this.page.getByRole('switch', {checked}));
        await toggle.waitFor({state: 'visible'});
    }
}
