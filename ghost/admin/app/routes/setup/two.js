import Route from 'ember-route';
import injectService from 'ember-service/inject';
import {
    VersionMismatchError,
    isVersionMismatchError
} from 'ghost-admin/services/ajax';

export default Route.extend({

    session: injectService(),
    notifications: injectService(),

    actions: {
        // TODO: reduce duplication with setup/signin/signup routes
        authenticateWithGhostOrg() {
            let authStrategy = 'authenticator:oauth2-ghost';

            this.toggleProperty('controller.loggingIn');
            this.set('controller.flowErrors', '');

            this.get('torii')
                .open('ghost-oauth2', {type: 'setup'})
                .then((authentication) => {
                    this.send('authenticate', authStrategy, [authentication]);
                })
                .catch(() => {
                    this.toggleProperty('controller.loggingIn');
                    this.set('controller.flowErrors', 'Authentication with Ghost.org denied or failed');
                });
        },

        authenticate(strategy, authentication) {
            // we don't want to redirect after sign-in during setup
            this.set('session.skipAuthSuccessHandler', true);

            // Authentication transitions to posts.index, we can leave spinner running unless there is an error
            this.get('session')
                .authenticate(strategy, ...authentication)
                .then(() => {
                    this.get('controller.errors').remove('session');
                })
                .catch((error) => {
                    if (error && error.errors) {
                        // we don't get back an ember-data/ember-ajax error object
                        // back so we need to pass in a null status in order to
                        // test against the payload
                        if (isVersionMismatchError(null, error)) {
                            let versionMismatchError = new VersionMismatchError(error);
                            return this.get('notifications').showAPIError(versionMismatchError);
                        }

                        error.errors.forEach((err) => {
                            err.message = err.message.htmlSafe();
                        });

                        this.set('controller.flowErrors', error.errors[0].message.string);
                    } else {
                        // Connection errors don't return proper status message, only req.body
                        this.get('notifications').showAlert('There was a problem on the server.', {type: 'error', key: 'session.authenticate.failed'});
                    }
                })
                .finally(() => {
                    this.toggleProperty('controller.loggingIn');
                });
        }
    }
});
