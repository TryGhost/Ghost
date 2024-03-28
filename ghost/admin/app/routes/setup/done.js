import Route from '@ember/routing/route';
import {inject as service} from '@ember/service';

export default class SetupFinishingTouchesRoute extends Route {
    @service feature;
    @service onboarding;
    @service router;
    @service session;
    @service settings;
    @service themeManagement;

    beforeModel() {
        if (!this.session.user.isOwnerOnly) {
            return;
        }

        if (this.feature.onboardingChecklist) {
            this.onboarding.startChecklist();
            return this.router.transitionTo('dashboard');
        }
    }

    model() {
        this.themeManagement.setPreviewType('homepage');
        this.themeManagement.updatePreviewHtmlTask.perform();
    }

    deactivate() {
        // rollback any unsaved setting changes when leaving
        this.settings.rollbackAttributes();
    }
}
