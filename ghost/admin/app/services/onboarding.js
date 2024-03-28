import Service, {inject as service} from '@ember/service';
import {TrackedSet} from 'tracked-built-ins';
import {action} from '@ember/object';
import {tracked} from '@glimmer/tracking';

export default class OnboardingService extends Service {
    @service feature;
    @service session;

    @tracked _completedSteps = new TrackedSet();

    ONBOARDING_STEPS = [
        'customize-design',
        'first-post',
        'build-audience',
        'share-publication'
    ];

    get isChecklistShown() {
        return this.feature.onboardingChecklist
            && this.session.user.isOwnerOnly;
    }

    get nextStep() {
        return this.ONBOARDING_STEPS.find(step => !this.isStepCompleted(step));
    }

    @action
    isStepCompleted(step) {
        return this._completedSteps.has(step);
    }

    @action
    markStepCompleted(step) {
        this._completedSteps.add(step);
    }
}
