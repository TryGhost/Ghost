import Service, {inject as service} from '@ember/service';

export default class OnboardingService extends Service {
    @service feature;
    @service session;

    get isChecklistShown() {
        return this.feature.onboardingChecklist
            && this.session.user.isOwnerOnly;
    }
}
