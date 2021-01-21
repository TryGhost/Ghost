import Route from '@ember/routing/route';

export default class HomeRoute extends Route {
    beforeModel() {
        this.transitionTo('site');
    }
}
