import Route from 'ember-route';
import injectService from 'ember-service/inject';
import EmberObject from 'ember-object';
import styleBody from 'ghost-admin/mixins/style-body';
import Configuration from 'ember-simple-auth/configuration';
import DS from 'ember-data';
import {
    isVersionMismatchError
} from 'ghost-admin/services/ajax';

const {Errors} = DS;

export default Route.extend(styleBody, {
    titleToken: 'Sign In',

    classNames: ['ghost-login'],

    session: injectService(),
    notifications: injectService(),

    beforeModel() {
        this._super(...arguments);

        if (this.get('session.isAuthenticated')) {
            this.transitionTo(Configuration.routeIfAlreadyAuthenticated);
        }
    },

    model() {
        return EmberObject.create({
            identification: '',
            password: '',
            errors: Errors.create()
        });
    },

    // the deactivate hook is called after a route has been exited.
    deactivate() {
        let controller = this.controllerFor('signin');

        this._super(...arguments);

        // clear the properties that hold the credentials when we're no longer on the signin screen
        controller.set('model.identification', '');
        controller.set('model.password', '');
    },

    actions: {
        authenticateWithGhostOrg() {
            let authStrategy = 'authenticator:oauth2-ghost';

            this.toggleProperty('controller.loggingIn');
            this.set('controller.flowErrors', '');

            return this.get('torii')
                .open('ghost-oauth2', {type: 'signin'})
                .then((authentication) => {
                    this.send('authenticate', authStrategy, [authentication]);
                })
                .catch(() => {
                    this.toggleProperty('controller.loggingIn');
                    this.set('controller.flowErrors', 'Authentication with Ghost.org denied or failed');
                });
        },

        authenticate(strategy, authentication) {
            // Authentication transitions to posts.index, we can leave spinner running unless there is an error
            return this.get('session')
                .authenticate(strategy, ...authentication)
                .catch((error) => {
                    this.toggleProperty('controller.loggingIn');

                    if (error && error.errors) {
                        // we don't get back an ember-data/ember-ajax error object
                        // back so we need to pass in a null status in order to
                        // test against the payload
                        if (isVersionMismatchError(error)) {
                            return this.get('notifications').showAPIError(error);
                        }

                        error.errors.forEach((err) => {
                            err.message = err.message.htmlSafe();
                        });

                        this.set('controller.flowErrors', error.errors[0].message.string);

                        if (error.errors[0].message.string.match(/user with that email/)) {
                            this.get('controller.model.errors').add('identification', '');
                        }

                        if (error.errors[0].message.string.match(/password is incorrect/)) {
                            this.get('controller.model.errors').add('password', '');
                        }
                    } else {
                        // Connection errors don't return proper status message, only req.body
                        this.get('notifications').showAlert('There was a problem on the server.', {type: 'error', key: 'session.authenticate.failed'});
                    }
                });
        }
    }
});
