import Ember from 'ember';
import DS from 'ember-data';
import {request as ajax} from 'ic-ajax';
import Configuration from 'ember-simple-auth/configuration';
import styleBody from 'ghost/mixins/style-body';

const {Route, RSVP, inject} = Ember;
const {Errors} = DS;

export default Route.extend(styleBody, {
    classNames: ['ghost-signup'],

    ghostPaths: inject.service('ghost-paths'),
    notifications: inject.service(),
    session: inject.service(),

    beforeModel() {
        this._super(...arguments);

        if (this.get('session.isAuthenticated')) {
            this.get('notifications').showAlert('You need to sign out to register as a new user.', {type: 'warn', delayed: true, key: 'signup.create.already-authenticated'});
            this.transitionTo(Configuration.routeIfAlreadyAuthenticated);
        }
    },

    model(params) {
        let model = Ember.Object.create();
        let re = /^(?:[A-Za-z0-9_\-]{4})*(?:[A-Za-z0-9_\-]{2}|[A-Za-z0-9_\-]{3})?$/;
        let email,
            tokenText;

        return new RSVP.Promise((resolve) => {
            if (!re.test(params.token)) {
                this.get('notifications').showAlert('Invalid token.', {type: 'error', delayed: true, key: 'signup.create.invalid-token'});

                return resolve(this.transitionTo('signin'));
            }

            tokenText = atob(params.token);
            email = tokenText.split('|')[1];

            model.set('email', email);
            model.set('token', params.token);
            model.set('errors', Errors.create());

            return ajax({
                url: this.get('ghostPaths.url').api('authentication', 'invitation'),
                type: 'GET',
                dataType: 'json',
                data: {
                    email
                }
            }).then((response) => {
                if (response && response.invitation && response.invitation[0].valid === false) {
                    this.get('notifications').showAlert('The invitation does not exist or is no longer valid.', {type: 'warn', delayed: true, key: 'signup.create.invalid-invitation'});

                    return resolve(this.transitionTo('signin'));
                }

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
    }
});
