import Controller from 'ember-controller';
import RSVP from 'rsvp';
import injectService from 'ember-service/inject';
import {isEmberArray} from 'ember-array/utils';

import ValidationEngine from 'ghost-admin/mixins/validation-engine';
import {isVersionMismatchError} from 'ghost-admin/services/ajax';

const {Promise} = RSVP;

export default Controller.extend(ValidationEngine, {
    // ValidationEngine settings
    validationType: 'signup',

    submitting: false,
    flowErrors: '',
    image: null,

    ghostPaths: injectService(),
    config: injectService(),
    notifications: injectService(),
    session: injectService(),
    ajax: injectService(),

    sendImage() {
        let image = this.get('image');

        this.get('session.user').then((user) => {
            return new Promise((resolve, reject) => {
                image.formData = {};
                image.submit()
                    .success((response) => {
                        let usersUrl = this.get('ghostPaths.url').api('users', user.id.toString());
                        user.image = response;
                        this.get('ajax').put(usersUrl, {
                            data: {
                                users: [user]
                            }
                        }).then(resolve).catch(reject);
                    })
                    .error(reject);
            });
        });
    },

    actions: {
        signup() {
            let model = this.get('model');
            let setupProperties = ['name', 'email', 'password', 'token'];
            let data = model.getProperties(setupProperties);
            let image = this.get('image');
            let notifications = this.get('notifications');

            this.set('flowErrors', '');

            this.get('hasValidated').addObjects(setupProperties);
            this.validate().then(() => {
                let authUrl = this.get('ghostPaths.url').api('authentication', 'invitation');
                this.toggleProperty('submitting');
                this.get('ajax').post(authUrl, {
                    dataType: 'json',
                    data: {
                        invitation: [{
                            name: data.name,
                            email: data.email,
                            password: data.password,
                            token: data.token
                        }]
                    }
                }).then(() => {
                    this.get('session').authenticate('authenticator:oauth2', this.get('model.email'), this.get('model.password')).then(() => {
                        if (image) {
                            this.sendImage();
                        }
                    }).catch((resp) => {
                        notifications.showAPIError(resp, {key: 'signup.complete'});
                    });
                }).catch((error) => {
                    this.toggleProperty('submitting');

                    if (error && error.errors && isEmberArray(error.errors)) {
                        if (isVersionMismatchError(error)) {
                            notifications.showAPIError(error);
                        }
                        this.set('flowErrors', error.errors[0].message);
                    } else {
                        notifications.showAPIError(error, {key: 'signup.complete'});
                    }
                });
            }).catch(() => {
                this.set('flowErrors', 'Please fill out the form to complete your sign-up');
            });
        },

        setImage(image) {
            this.set('image', image);
        }
    }
});
