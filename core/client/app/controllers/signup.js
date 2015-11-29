import Ember from 'ember';
import {request as ajax} from 'ic-ajax';
import ValidationEngine from 'ghost/mixins/validation-engine';

export default Ember.Controller.extend(ValidationEngine, {
    // ValidationEngine settings
    validationType: 'signup',

    submitting: false,
    flowErrors: '',
    image: null,

    ghostPaths: Ember.inject.service('ghost-paths'),
    config: Ember.inject.service(),
    notifications: Ember.inject.service(),
    session: Ember.inject.service(),

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
                setupProperties = ['name', 'email', 'password', 'token'],
                data = model.getProperties(setupProperties),
                image = this.get('image'),

                notifications = this.get('notifications');

            this.set('flowErrors', '');

            this.get('hasValidated').addObjects(setupProperties);
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
                    self.get('session').authenticate('authenticator:oauth2', self.get('model.email'), self.get('model.password')).then(function () {
                        if (image) {
                            self.sendImage();
                        }
                    }).catch(function (resp) {
                        notifications.showAPIError(resp, {key: 'signup.complete'});
                    });
                }).catch(function (resp) {
                    self.toggleProperty('submitting');
                    if (resp && resp.jqXHR && resp.jqXHR.responseJSON && resp.jqXHR.responseJSON.errors) {
                        self.set('flowErrors', resp.jqXHR.responseJSON.errors[0].message);
                    } else {
                        notifications.showAPIError(resp, {key: 'signup.complete'});
                    }
                });
            }).catch(function () {
                self.set('flowErrors', 'Please fill out the form to complete your sign-up');
            });
        },
        setImage: function (image) {
            this.set('image', image);
        }
    }
});
