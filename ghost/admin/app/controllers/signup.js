import Controller from '@ember/controller';
import {alias} from '@ember/object/computed';
import {isArray as isEmberArray} from '@ember/array';
import {
    isVersionMismatchError
} from 'ghost-admin/services/ajax';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';

export default Controller.extend({
    ajax: service(),
    config: service(),
    ghostPaths: service(),
    notifications: service(),
    session: service(),
    settings: service(),

    flowErrors: '',

    signupDetails: alias('model'),

    actions: {
        validate(property) {
            return this.signupDetails.validate({property});
        },

        submit(event) {
            event.preventDefault();
            this.signup.perform();
        }
    },

    signup: task(function* () {
        let setupProperties = ['name', 'email', 'password', 'token'];
        let notifications = this.notifications;

        this.set('flowErrors', '');
        this.get('signupDetails.hasValidated').addObjects(setupProperties);

        try {
            yield this.signupDetails.validate();
            yield this._completeInvitation();

            try {
                yield this._authenticateWithPassword();
            } catch (error) {
                notifications.showAPIError(error, {key: 'signup.complete'});
            }

            return true;
        } catch (error) {
            // ValidationEngine throws undefined
            if (!error) {
                this.set('flowErrors', 'Please fill out the form to complete your signup');
                return false;
            }

            if (error && error.payload && error.payload.errors && isEmberArray(error.payload.errors)) {
                if (isVersionMismatchError(error)) {
                    notifications.showAPIError(error);
                }
                this.set('flowErrors', error.payload.errors[0].message);
            } else {
                notifications.showAPIError(error, {key: 'signup.complete'});
            }

            return false;
        }
    }).drop(),

    _completeInvitation() {
        let authUrl = this.get('ghostPaths.url').api('authentication', 'invitation');
        let signupDetails = this.signupDetails;

        return this.ajax.post(authUrl, {
            dataType: 'json',
            data: {
                invitation: [{
                    name: signupDetails.get('name'),
                    email: signupDetails.get('email'),
                    password: signupDetails.get('password'),
                    token: signupDetails.get('token')
                }]
            }
        });
    },

    _authenticateWithPassword() {
        let email = this.get('signupDetails.email');
        let password = this.get('signupDetails.password');

        return this.session
            .authenticate('authenticator:cookie', email, password);
    }
});
