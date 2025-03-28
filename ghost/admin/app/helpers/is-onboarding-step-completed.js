import Helper from '@ember/component/helper';
import {inject as service} from '@ember/service';

export default class IsOnboardingStepCompleted extends Helper {
    @service onboarding;

    compute([step]) {
        return this.onboarding.isStepCompleted(step);
    }
}
