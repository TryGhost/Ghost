import Route from '@ember/routing/route';

export default class ThreeRoute extends Route {
    beforeModel() {
        super.beforeModel(...arguments);
        if (!this.controllerFor('setup.two').get('blogCreated')) {
            this.transitionTo('setup.two');
        }
    }
}
