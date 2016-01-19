import Ember from 'ember';
import ValidationEngine from 'ghost/mixins/validation-engine';

const {
    Controller,
    RSVP: {Promise},
    inject: {service},
    isArray
} = Ember;

export default Controller.extend(ValidationEngine, {
    // ValidationEngine settings
    validationType: 'signup',

    submitting: false,
    flowErrors: '',
    image: null,

    ghostPaths: service(),
    config: service(),
    notifications: service(),
    session: service(),
    ajax: service(),

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
                }).catch((resp) => {
                    this.toggleProperty('submitting');

                    if (resp && resp.errors && isArray(resp.errors)) {
                        this.set('flowErrors', resp.errors[0].message);
                    } else {
                        notifications.showAPIError(resp, {key: 'signup.complete'});
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
