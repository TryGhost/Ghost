import Controller from 'ember-controller';
import RSVP from 'rsvp';
import ValidationEngine from 'ghost-admin/mixins/validation-engine';
import injectService from 'ember-service/inject';
import {
    VersionMismatchError,
    isVersionMismatchError
} from 'ghost-admin/services/ajax';
import {assign} from 'ember-platform';
import {isEmberArray} from 'ember-array/utils';
import {task} from 'ember-concurrency';

export default Controller.extend(ValidationEngine, {
    ajax: injectService(),
    config: injectService(),
    ghostPaths: injectService(),
    notifications: injectService(),
    session: injectService(),
    settings: injectService(),
    torii: injectService(),

    // ValidationEngine settings
    validationType: 'signup',

    flowErrors: '',
    profileImage: null,

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

                this.set('flowErrors', error.errors[0].message.string);

                if (error.errors[0].message.string.match(/user with that email/)) {
                    this.get('model.errors').add('identification', '');
                }

                if (error.errors[0].message.string.match(/password is incorrect/)) {
                    this.get('model.errors').add('password', '');
                }
            } else {
                // Connection errors don't return proper status message, only req.body
                this.get('notifications').showAlert('There was a problem on the server.', {type: 'error', key: 'session.authenticate.failed'});
                throw error;
            }
        }
    }).drop(),

    authenticateWithGhostOrg: task(function* () {
        let authStrategy = 'authenticator:oauth2-ghost';
        let inviteToken = this.get('model.token');
        let email = this.get('model.email');

        this.set('flowErrors', '');

        try {
            let authentication = yield this.get('torii')
                .open('ghost-oauth2', {email, type: 'invite'});

            authentication = assign(authentication, {inviteToken});

            return yield this.get('authenticate').perform(authStrategy, [authentication]);

        } catch (error) {
            this.set('flowErrors', 'Authentication with Ghost.org denied or failed');
            throw error;
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
                yield this._sendImage();
            } catch (error) {
                notifications.showAPIError(error, {key: 'signup.complete'});
            }

        } catch (error) {
            // ValidationEngine throws undefined
            if (!error) {
                this.set('flowErrors', 'Please fill out the form to complete your sign-up');
            }

            if (error && error.errors && isEmberArray(error.errors)) {
                if (isVersionMismatchError(error)) {
                    notifications.showAPIError(error);
                }
                this.set('flowErrors', error.errors[0].message);
            } else {
                notifications.showAPIError(error, {key: 'signup.complete'});
            }
        }
    }),

    _completeInvitation() {
        let authUrl = this.get('ghostPaths.url').api('authentication', 'invitation');
        let model = this.get('model');

        return this.get('ajax').post(authUrl, {
            dataType: 'json',
            data: {
                invitation: [{
                    name: model.get('name'),
                    email: model.get('email'),
                    password: model.get('password'),
                    token: model.get('token')
                }]
            }
        });
    },

    _authenticateWithPassword() {
        let email = this.get('model.email');
        let password = this.get('model.password');

        return this.get('session')
            .authenticate('authenticator:oauth2', email, password);
    },

    _sendImage() {
        let formData = new FormData();
        let imageFile = this.get('profileImage');
        let uploadUrl = this.get('ghostPaths.url').api('uploads');

        if (imageFile) {
            formData.append('uploadimage', imageFile, imageFile.name);

            return this.get('session.user').then((user) => {
                return this.get('ajax').post(uploadUrl, {
                    data: formData,
                    processData: false,
                    contentType: false,
                    dataType: 'text'
                }).then((response) => {
                    let imageUrl = JSON.parse(response);
                    let usersUrl = this.get('ghostPaths.url').api('users', user.id.toString());
                    // eslint-disable-next-line
                    user.profile_image = imageUrl;

                    return this.get('ajax').put(usersUrl, {
                        data: {
                            users: [user]
                        }
                    });
                });
            });
        }
    },

    actions: {
        signup() {
            this.get('signup').perform();
        },

        setImage(image) {
            this.set('profileImage', image);
        }
    }
});
