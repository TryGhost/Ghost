import Controller from '@ember/controller';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

export default class ExploreController extends Controller {
    @service explore;
    @service router;

    get exploreCredentials() {
        const explore = this.model.findBy('slug', 'ghost-explore');
        const adminKey = explore.adminKey;

        return adminKey.secret;
    }

    get visibilityClass() {
        return this.explore.isIframeTransition ? 'explore iframe-explore-container' : ' explore fullscreen-explore-container';
    }

    @action
    closeConnect() {
        if (this.explore.isIframeTransition) {
            this.explore.sendRouteUpdate({path: '/explore'});
            this.router.transitionTo('/explore');
        } else {
            this.router.transitionTo('/dashboard');
        }
    }

    @action
    submitExploreSite() {
        const token = this.exploreCredentials;
        const apiUrl = this.explore.apiUrl;

        const query = new URLSearchParams();

        query.append('token', token);
        query.append('url', apiUrl);

        if (this.explore.isIframeTransition) {
            this.explore.sendRouteUpdate({path: this.explore.submitRoute, queryParams: query.toString()});

            // Set a short timeout to give Explore enough time to navigate
            // to the submit page and fetch the required site data
            setTimeout(() => {
                this.explore.toggleExploreWindow(true);
            }, 500);
        } else {
            // Ghost Explore URL to submit a new site
            const destination = new URL(`${this.explore.exploreUrl}${this.explore.submitRoute}`);
            destination.search = query;

            window.location = destination.toString();
        }
    }
}
