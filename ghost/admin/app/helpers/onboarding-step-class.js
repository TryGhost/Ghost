import Helper from '@ember/component/helper';
import {inject as service} from '@ember/service';

export default class OnboardingStepClasses extends Helper {
    @service onboarding;

    compute([step]) {
        if (this.onboarding.isStepCompleted(step)) {
            return 'gh-onboarding-item--completed';
        }

        if (this.onboarding.nextStep === step) {
            return 'gh-onboarding-item--next';
        }
    }
}
