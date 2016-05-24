import Ember from 'ember';
import Configuration from 'ember-simple-auth/configuration';
import styleBody from 'ghost-admin/mixins/style-body';

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
                let [setup] = result.setup;

                if (setup.status) {
                    return this.transitionTo('signin');
                } else {
                    let controller = this.controllerFor('setup/two');
                    if (setup.title) {
                        controller.set('blogTitle', setup.title.replace(/&apos;/gim, '\''));
                    }

                    if (setup.name) {
                        controller.set('name', setup.name.replace(/&apos;/gim, '\''));
                    }

                    if (setup.email) {
                        controller.set('email', setup.email);
                    }
                }
            });
    },

    deactivate() {
        this._super(...arguments);
        this.controllerFor('setup/two').set('password', '');
    }
});
