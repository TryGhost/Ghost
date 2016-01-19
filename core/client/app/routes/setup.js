import Ember from 'ember';
import Configuration from 'ember-simple-auth/configuration';
import styleBody from 'ghost/mixins/style-body';

const {
    Route,
    inject: {service}
} = Ember;

export default Route.extend(styleBody, {
    titleToken: 'Setup',

    classNames: ['ghost-setup'],

    ghostPaths: service('ghost-paths'),
    session: service(),
    ajax: service(),

    // use the beforeModel hook to check to see whether or not setup has been
    // previously completed.  If it has, stop the transition into the setup page.
    beforeModel() {
        this._super(...arguments);

        if (this.get('session.isAuthenticated')) {
            this.transitionTo(Configuration.routeIfAlreadyAuthenticated);
            return;
        }

        let authUrl = this.get('ghostPaths.url').api('authentication', 'setup');

        // If user is not logged in, check the state of the setup process via the API
        return this.get('ajax').request(authUrl)
            .then((result) => {
                let setup = result.setup[0].status;

                if (setup) {
                    return this.transitionTo('signin');
                }
            });
    },

    deactivate() {
        this._super(...arguments);
        this.controllerFor('setup/two').set('password', '');
    }
});
