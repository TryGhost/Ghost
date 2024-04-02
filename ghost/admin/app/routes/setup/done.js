import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import {inject as service} from '@ember/service';

export default class SetupFinishingTouchesRoute extends AuthenticatedRoute {
    @service feature;
    @service onboarding;
    @service router;
    @service session;
    @service settings;
    @service themeManagement;

    beforeModel() {
        super.beforeModel(...arguments);

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
