import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import {inject} from 'ghost-admin/decorators/inject';
import {inject as service} from '@ember/service';

export default class SetupFinishingTouchesRoute extends AuthenticatedRoute {
    @inject config;
    @service feature;
    @service onboarding;
    @service router;
    @service session;
    @service settings;

    beforeModel() {
        super.beforeModel(...arguments);

        if (this.session.user.isOwnerOnly) {
            this.onboarding.startChecklist();
        }

        if (this.session.user?.isAdmin) {
            return this.router.transitionTo('stats-x');
        }
    }
}
