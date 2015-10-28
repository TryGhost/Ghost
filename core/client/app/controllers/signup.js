import Ember from 'ember';
import {request as ajax} from 'ic-ajax';
import ValidationEngine from 'ghost/mixins/validation-engine';

const {Controller, RSVP, inject} = Ember;

export default Controller.extend(ValidationEngine, {
    // ValidationEngine settings
    validationType: 'signup',

    submitting: false,
    flowErrors: '',
    image: null,

    ghostPaths: inject.service('ghost-paths'),
    config: inject.service(),
    notifications: inject.service(),
    session: inject.service(),

    sendImage() {
        let image = this.get('image');

        this.get('session.user').then((user) => {
            return new RSVP.Promise((resolve, reject) => {
                image.formData = {};
                image.submit()
                    .success((response) => {
                        user.image = response;
                        ajax({
                            url: this.get('ghostPaths.url').api('users', user.id.toString()),
                            type: 'PUT',
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
                this.toggleProperty('submitting');
                ajax({
                    url: this.get('ghostPaths.url').api('authentication', 'invitation'),
                    type: 'POST',
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
                    if (resp && resp.jqXHR && resp.jqXHR.responseJSON && resp.jqXHR.responseJSON.errors) {
                        this.set('flowErrors', resp.jqXHR.responseJSON.errors[0].message);
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
