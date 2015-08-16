import Ember from 'ember';
import {request as ajax} from 'ic-ajax';
import ValidationEngine from 'ghost/mixins/validation-engine';

export default Ember.Controller.extend(ValidationEngine, {
    // ValidationEngine settings
    validationType: 'signup',

    submitting: false,
    flowErrors: '',
    image: null,
    validEmail: '',

    ghostPaths: Ember.inject.service('ghost-paths'),
    config: Ember.inject.service(),
    notifications: Ember.inject.service(),

    sendImage: function () {
        var self = this,
            image = this.get('image');

        this.get('session.user').then(function (user) {
            return new Ember.RSVP.Promise(function (resolve, reject) {
                image.formData = {};
                image.submit()
                    .success(function (response) {
                        user.image = response;
                        ajax({
                            url: self.get('ghostPaths.url').api('users', user.id.toString()),
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
        signup: function () {
            var self = this,
                model = this.get('model'),
                data = model.getProperties('name', 'email', 'password', 'token'),
                image = this.get('image'),

                notifications = this.get('notifications');

            this.set('flowErrors', '');
            notifications.closeNotifications();

            this.validate().then(function () {
                self.toggleProperty('submitting');
                ajax({
                    url: self.get('ghostPaths.url').api('authentication', 'invitation'),
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
                }).then(function () {
                    self.get('session').authenticate('simple-auth-authenticator:oauth2-password-grant', {
                        identification: self.get('model.email'),
                        password: self.get('model.password')
                    }).then(function () {
                        if (image) {
                            self.sendImage();
                        }
                    }).catch(function (resp) {
                        notifications.showAPIError(resp);
                    });
                }).catch(function (resp) {
                    self.toggleProperty('submitting');
                    if (resp && resp.jqXHR && resp.jqXHR.responseJSON && resp.jqXHR.responseJSON.errors) {
                        self.set('flowErrors', resp.jqXHR.responseJSON.errors[0].message);
                    } else {
                        notifications.showAPIError(resp);
                    }
                });
            }).catch(function () {
                self.set('flowErrors', 'Please fill out the form to complete your sign-up');
            });
        },
        setImage: function (image) {
            this.set('image', image);
        },
        handleEmail: function () {
            var self = this;

            this.validate({property: 'email'}).then(function () {
                self.set('validEmail', self.get('email'));
            });
        }
    }
});
