import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

export default class ExploreRoute extends AuthenticatedRoute {
    @service explore;
    @service session;
    @service config;

    beforeModel(transition) {
        super.beforeModel(...arguments);

        if (transition.to?.queryParams?.new === 'true' || !this.explore.enabled) {
            return this.router.transitionTo('explore-connect');
        }

        this.explore.previousTransition = transition;
    }

    model() {
        this.explore.toggleExploreWindow(true);
    }

    @action
    willTransition(transition) {
        let isExploreTransition = false;

        if (transition) {
            let destinationUrl = (typeof transition.to === 'string')
                ? transition.to
                : (transition.intent
                    ? transition.intent.url
                    : '');

            if (destinationUrl?.includes('/explore')) {
                isExploreTransition = true;
            }
        }

        this.explore.toggleExploreWindow(isExploreTransition);
    }

    buildRouteInfoMetadata() {
        return {
            titleToken: 'Explore'
        };
    }
}
