import Route from 'ember-route';
import RSVP from 'rsvp';
import injectService from 'ember-service/inject';
import EmberObject from 'ember-object';
import {assign} from 'ember-platform';
import {
    VersionMismatchError,
    isVersionMismatchError
} from 'ghost-admin/services/ajax';

import DS from 'ember-data';
import Configuration from 'ember-simple-auth/configuration';
import styleBody from 'ghost-admin/mixins/style-body';

const {Promise} = RSVP;
const {Errors} = DS;

export default Route.extend(styleBody, {
    classNames: ['ghost-signup'],

    ghostPaths: injectService(),
    notifications: injectService(),
    session: injectService(),
    ajax: injectService(),

    beforeModel() {
        this._super(...arguments);

        if (this.get('session.isAuthenticated')) {
            this.get('notifications').showAlert('You need to sign out to register as a new user.', {type: 'warn', delayed: true, key: 'signup.create.already-authenticated'});
            this.transitionTo(Configuration.routeIfAlreadyAuthenticated);
        }
    },

    model(params) {
        let model = EmberObject.create();
        let re = /^(?:[A-Za-z0-9_\-]{4})*(?:[A-Za-z0-9_\-]{2}|[A-Za-z0-9_\-]{3})?$/;
        let email,
            tokenText;

        return new Promise((resolve) => {
            if (!re.test(params.token)) {
                this.get('notifications').showAlert('Invalid token.', {type: 'error', delayed: true, key: 'signup.create.invalid-token'});

                return resolve(this.transitionTo('signin'));
            }

            tokenText = atob(params.token);
            email = tokenText.split('|')[1];

            model.set('email', email);
            model.set('token', params.token);
            model.set('errors', Errors.create());

            let authUrl = this.get('ghostPaths.url').api('authentication', 'invitation');

            return this.get('ajax').request(authUrl, {
                dataType: 'json',
                data: {
                    email
                }
            }).then((response) => {
                if (response && response.invitation && response.invitation[0].valid === false) {
                    this.get('notifications').showAlert('The invitation does not exist or is no longer valid.', {type: 'warn', delayed: true, key: 'signup.create.invalid-invitation'});

                    return resolve(this.transitionTo('signin'));
                }

                model.set('invitedBy', response.invitation[0].invitedBy);

                resolve(model);
            }).catch(() => {
                resolve(model);
            });
        });
    },

    deactivate() {
        this._super(...arguments);

        // clear the properties that hold the sensitive data from the controller
        this.controllerFor('signup').setProperties({email: '', password: '', token: ''});
    },

    actions: {
        authenticateWithGhostOrg() {
            let authStrategy = 'authenticator:oauth2-ghost';
            let inviteToken = this.get('controller.model.token');
            let email = this.get('controller.model.email');

            this.toggleProperty('controller.loggingIn');
            this.set('controller.flowErrors', '');

            this.get('torii')
                .open('ghost-oauth2', {email, type: 'invite'})
                .then((authentication) => {
                    let _authentication = assign({}, authentication, {inviteToken});
                    this.send('authenticate', authStrategy, [_authentication]);
                })
                .catch(() => {
                    this.toggleProperty('controller.loggingIn');
                    this.set('controller.flowErrors', 'Authentication with Ghost.org denied or failed');
                });
        },

        // TODO: this is duplicated with the signin route - maybe extract into a mixin?
        authenticate(strategy, authentication) {
            // Authentication transitions to posts.index, we can leave spinner running unless there is an error
            this.get('session')
                .authenticate(strategy, ...authentication)
                .catch((error) => {
                    this.toggleProperty('controller.loggingIn');

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
