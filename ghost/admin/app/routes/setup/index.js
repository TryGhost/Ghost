import Route from '@ember/routing/route';

export default class IndexRoute extends Route {
    beforeModel() {
        super.beforeModel(...arguments);
        this.transitionTo('setup.one');
    }
}
