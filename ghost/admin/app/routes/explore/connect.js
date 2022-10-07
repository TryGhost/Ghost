import ExploreRoute from './index';

export default class ExploreConnectRoute extends ExploreRoute {
    controllerName = 'explore';

    // Ensure to always close the iframe, as we're now on an Ember route
    beforeModel() {
        this.explore.toggleExploreWindow(false);
    }
}
