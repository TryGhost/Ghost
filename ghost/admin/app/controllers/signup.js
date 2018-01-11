import Controller from '@ember/controller';
import RSVP from 'rsvp';
import ValidationEngine from 'ghost-admin/mixins/validation-engine';
import {
    VersionMismatchError,
    isVersionMismatchError
} from 'ghost-admin/services/ajax';
import {alias} from '@ember/object/computed';
import {isArray as isEmberArray} from '@ember/array';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';

export default Controller.extend(ValidationEngine, {
    ajax: service(),
    config: service(),
    ghostPaths: service(),
    notifications: service(),
    session: service(),
    settings: service(),

    flowErrors: '',
    profileImage: null,

    // ValidationEngine settings
    validationType: 'signup',
    signupDetails: alias('model'),

    actions: {
        signup() {
            this.get('signup').perform();
        },

        setImage(image) {
            this.set('profileImage', image);
        }
    },

    authenticate: task(function* (authStrategy, authentication) {
        try {
            let authResult = yield this.get('session')
                .authenticate(authStrategy, ...authentication);
            let promises = [];

            promises.pushObject(this.get('settings').fetch());
            promises.pushObject(this.get('config').fetchPrivate());

            // fetch settings and private config for synchronous access
            yield RSVP.all(promises);

            return authResult;
        } catch (error) {
            if (error && error.payload && error.payload.errors) {
                // we don't get back an ember-data/ember-ajax error object
                // back so we need to pass in a null status in order to
                // test against the payload
                if (isVersionMismatchError(null, error)) {
                    let versionMismatchError = new VersionMismatchError(error);
                    return this.get('notifications').showAPIError(versionMismatchError);
                }

                error.payload.errors.forEach((err) => {
                    err.message = err.message.htmlSafe();
                });

                this.set('flowErrors', error.payload.errors[0].message.string);

                if (error.payload.errors[0].message.string.match(/user with that email/)) {
                    this.get('signupDetails.errors').add('email', '');
                }

                if (error.payload.errors[0].message.string.match(/password is incorrect/)) {
                    this.get('signupDetails.errors').add('password', '');
                }
            } else {
                // Connection errors don't return proper status message, only req.body
                this.get('notifications').showAlert('There was a problem on the server.', {type: 'error', key: 'session.authenticate.failed'});
                throw error;
            }
        }
    }).drop(),

    signup: task(function* () {
        let setupProperties = ['name', 'email', 'password', 'token'];
        let notifications = this.get('notifications');

        this.set('flowErrors', '');
        this.get('hasValidated').addObjects(setupProperties);

        try {
            yield this.validate();
            yield this._completeInvitation();

            try {
                yield this._authenticateWithPassword();
                yield this.get('_sendImage').perform();
            } catch (error) {
                notifications.showAPIError(error, {key: 'signup.complete'});
            }
        } catch (error) {
            // ValidationEngine throws undefined
            if (!error) {
                this.set('flowErrors', 'Please fill out the form to complete your sign-up');
            }

            if (error && error.payload && error.payload.errors && isEmberArray(error.payload.errors)) {
                if (isVersionMismatchError(error)) {
                    notifications.showAPIError(error);
                }
                this.set('flowErrors', error.payload.errors[0].message);
            } else {
                notifications.showAPIError(error, {key: 'signup.complete'});
            }
        }
    }),

    _completeInvitation() {
        let authUrl = this.get('ghostPaths.url').api('authentication', 'invitation');
        let signupDetails = this.get('signupDetails');

        return this.get('ajax').post(authUrl, {
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

        return this.get('session')
            .authenticate('authenticator:oauth2', email, password);
    },

    _sendImage: task(function* () {
        let formData = new FormData();
        let imageFile = this.get('profileImage');
        let uploadUrl = this.get('ghostPaths.url').api('uploads');

        if (imageFile) {
            formData.append('uploadimage', imageFile, imageFile.name);

            let user = yield this.get('session.user');
            let response = yield this.get('ajax').post(uploadUrl, {
                data: formData,
                processData: false,
                contentType: false,
                dataType: 'text'
            });

            let imageUrl = JSON.parse(response);
            let usersUrl = this.get('ghostPaths.url').api('users', user.id.toString());

            user.profile_image = imageUrl;

            return yield this.get('ajax').put(usersUrl, {
                data: {
                    users: [user]
                }
            });
        }
    })
});
