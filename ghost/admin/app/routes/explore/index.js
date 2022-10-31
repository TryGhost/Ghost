import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

export default class ExploreIndexRoute extends AuthenticatedRoute {
    @service explore;
    @service store;
    @service router;
    @service feature;

    beforeModel(transition) {
        super.beforeModel(...arguments);

        // Usage of query param to ensure that sites can be submitted across
        // older versions of Ghost where the `connect` part lives in the
        // explore route directly. By using the query param, we avoid causing
        // a 404 and handle the redirect here.
        if (transition.to?.queryParams?.new === 'true') {
            this.explore.isIframeTransition = false;
            return this.router.transitionTo('explore.connect');
        }

        // Ensure the explore window is set to open
        if (transition.to?.localName === 'index' && !this.explore.exploreWindowOpen) {
            this.explore.openExploreWindow(this.router.currentURL);
        }
    }

    model() {
        return this.store.findAll('integration');
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
                this.explore.isIframeTransition = isExploreTransition;

                if (destinationUrl?.includes('/explore/submit')) {
                    // only show the submit page if the site is already submitted
                    // and redirect to the connect page if not.
                    if (Object.keys(this?.explore?.siteData).length >= 1) {
                        this.controllerFor('explore').submitExploreSite();
                    } else {
                        transition.abort();
                        return this.router.transitionTo('explore.connect');
                    }
                } else {
                    let path = destinationUrl.replace(/explore\//, '');
                    path = path === '/' ? '/explore/' : path;

                    if (destinationUrl?.includes('/explore/about')) {
                        window.open(`${this.explore.exploreUrl}about/`, '_blank').focus();
                        path = '/explore/';
                    }
                    // Send the updated route to the iframe
                    this.explore.sendRouteUpdate({path});
                }
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
