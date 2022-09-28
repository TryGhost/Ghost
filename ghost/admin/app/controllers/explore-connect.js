import Controller from '@ember/controller';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

export default class ExploreController extends Controller {
    @service ghostPaths;
    @service explore;

    get exploreCredentials() {
        const explore = this.model.findBy('slug', 'ghost-explore');
        const adminKey = explore.adminKey;

        return adminKey.secret;
    }

    @action
    submitExploreSite() {
        const token = this.exploreCredentials;
        const apiUrl = this.explore.apiUrl;

        // Ghost Explore URL to submit a new site
        const destination = new URL('https://ghost.org/explore/submit');
        const query = new URLSearchParams();

        query.append('token', token);
        query.append('url', apiUrl);

        destination.search = query;

        window.location = destination.toString();
    }
}
