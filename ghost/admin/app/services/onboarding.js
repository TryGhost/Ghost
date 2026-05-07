import Service, {inject as service} from '@ember/service';

export default class OnboardingService extends Service {
    @service session;

    async startChecklist() {
        const userSettings = JSON.parse(this.session.user.accessibility || '{}');

        userSettings.onboarding = {
            completedSteps: [],
            checklistState: 'started',
            startedAt: new Date().toISOString()
        };

        this.session.user.accessibility = JSON.stringify(userSettings);
        await this.session.user.save();
    }
}
