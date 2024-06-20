import Service, {inject as service} from '@ember/service';
import {action} from '@ember/object';

const EMPTY_SETTINGS = {
    completedSteps: [],
    checklistState: 'pending' // pending, started, completed, dismissed
};

export default class OnboardingService extends Service {
    @service session;

    ONBOARDING_STEPS = [
        'customize-design',
        'first-post',
        'build-audience',
        'share-publication'
    ];

    get settings() {
        const userSettings = JSON.parse(this.session.user.accessibility || '{}');

        return userSettings.onboarding || JSON.parse(JSON.stringify(EMPTY_SETTINGS));
    }

    get isChecklistShown() {
        return this.session.user.isOwnerOnly
            && this.checklistStarted
            && !this.checklistCompleted
            && !this.checklistDismissed;
    }

    get checklistState() {
        return this.settings.checklistState;
    }

    get checklistStarted() {
        return this.settings.checklistState === 'started';
    }

    get checklistCompleted() {
        return this.settings.checklistState === 'completed';
    }

    get checklistDismissed() {
        return this.settings.checklistState === 'dismissed';
    }

    get completedSteps() {
        const settings = this.settings;

        return settings.completedSteps || [];
    }

    get nextStep() {
        return this.ONBOARDING_STEPS.find(step => !this.isStepCompleted(step));
    }

    get allStepsCompleted() {
        return this.ONBOARDING_STEPS.every(step => this.isStepCompleted(step));
    }

    @action
    async startChecklist() {
        const settings = this.settings;

        settings.completedSteps = [];
        settings.checklistState = 'started';

        await this._saveSettings(settings);
    }

    @action
    async completeChecklist() {
        const settings = this.settings;

        settings.checklistState = 'completed';

        await this._saveSettings(settings);
    }

    @action
    async dismissChecklist() {
        const settings = this.settings;

        settings.checklistState = 'dismissed';

        await this._saveSettings(settings);
    }

    @action
    isStepCompleted(step) {
        return this.completedSteps.includes(step);
    }

    @action
    async markStepCompleted(step) {
        if (this.isStepCompleted(step)) {
            return;
        }

        const settings = this.settings;
        settings.completedSteps.push(step);

        await this._saveSettings(settings);
    }

    @action
    async reset() {
        await this._saveSettings(undefined);
    }

    /* private */

    async _saveSettings(settings) {
        const userSettings = JSON.parse(this.session.user.accessibility || '{}');

        userSettings.onboarding = settings;

        this.session.user.accessibility = JSON.stringify(userSettings);
        await this.session.user.save();
    }
}
