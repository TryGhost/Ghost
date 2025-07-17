import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import {inject} from 'ghost-admin/decorators/inject';
import {inject as service} from '@ember/service';

export default class HomeRoute extends AuthenticatedRoute {
    @inject config;
    @service feature;
    @service router;
    @service session;

    beforeModel(transition) {
        super.beforeModel(...arguments);

        // This is needed to initialize the checklist for sites that have been already set up
        if (transition.to?.queryParams?.firstStart === 'true') {
            return this.replaceWith('setup.done');
        }

        if (this.session.user?.isAdmin) {
            return this.replaceWith('stats-x');
        } else if (this.session.user?.isContributor) {
            return this.replaceWith('posts');
        } else {
            return this.replaceWith('site');
        }
    }
}
