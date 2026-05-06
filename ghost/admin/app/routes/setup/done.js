import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import {inject} from 'ghost-admin/decorators/inject';
import {inject as service} from '@ember/service';

export default class SetupFinishingTouchesRoute extends AuthenticatedRoute {
    @inject config;
    @service feature;
    @service onboarding;
    @service session;
    @service settings;

    async beforeModel() {
        await super.beforeModel(...arguments);

        if (this.session.user.isOwnerOnly) {
            await this.onboarding.startChecklist();
        }

        if (this.session.user?.isAdmin) {
            // The React admin app owns /setup/onboarding, so hand off via hash navigation.
            window.location.hash = '/setup/onboarding?returnTo=/analytics';
        }
    }
}
