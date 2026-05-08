import {AdminPage} from '@/admin-pages';
import {Locator, Page} from '@playwright/test';

export class OnboardingPage extends AdminPage {
    public readonly checklist: Locator;
    public readonly completeButton: Locator;
    public readonly copyLinkButton: Locator;
    public readonly shareModal: Locator;
    public readonly skipButton: Locator;

    constructor(page: Page) {
        super(page);

        this.pageUrl = '/ghost/#/setup/onboarding';
        this.checklist = page.getByTestId('onboarding-checklist');
        this.completeButton = page.getByTestId('onboarding-complete');
        this.copyLinkButton = page.getByTestId('onboarding-copy-link');
        this.shareModal = page.getByTestId('onboarding-share-modal');
        this.skipButton = page.getByTestId('onboarding-skip');
    }

    step(stepId: string) {
        return this.page.getByTestId(`onboarding-step-${stepId}`);
    }
}
