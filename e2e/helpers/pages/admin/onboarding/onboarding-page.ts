import {AdminPage} from '@/admin-pages';
import {Locator, Page} from '@playwright/test';
import {
    onboardingChecklist,
    onboardingComplete,
    onboardingShareModal,
    onboardingSkip,
    onboardingStepPrefix
} from '@tryghost/test-data/selectors/onboarding';

export class OnboardingPage extends AdminPage {
    public readonly checklist: Locator;
    public readonly completeButton: Locator;
    public readonly copyLinkButton: Locator;
    public readonly shareModal: Locator;
    public readonly skipButton: Locator;

    constructor(page: Page) {
        super(page);

        this.pageUrl = '/ghost/#/setup/onboarding';
        this.checklist = page.getByTestId(onboardingChecklist);
        this.completeButton = page.getByTestId(onboardingComplete);
        this.copyLinkButton = page.getByTestId('onboarding-copy-link');
        this.shareModal = page.getByTestId(onboardingShareModal);
        this.skipButton = page.getByTestId(onboardingSkip);
    }

    step(stepId: string) {
        return this.page.getByTestId(`${onboardingStepPrefix}${stepId}`);
    }
}
