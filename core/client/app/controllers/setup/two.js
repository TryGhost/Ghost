import Ember from 'ember';
import {request as ajax} from 'ic-ajax';
import ValidationEngine from 'ghost/mixins/validation-engine';

export default Ember.Controller.extend(ValidationEngine, {
    size: 90,
    blogTitle: null,
    name: null,
    email: '',
    password: null,
    image: null,
    blogCreated: false,
    submitting: false,
    flowErrors: '',

    ghostPaths: Ember.inject.service('ghost-paths'),
    notifications: Ember.inject.service(),
    application: Ember.inject.controller(),
    config: Ember.inject.service(),
    session: Ember.inject.service(),

    // ValidationEngine settings
    validationType: 'setup',

    /**
     * Uploads the given data image, then sends the changed user image property to the server
     * @param  {Object} user User object, returned from the 'setup' api call
     * @return {Ember.RSVP.Promise} A promise that takes care of both calls
     */
    sendImage: function (user) {
        var self = this,
            image = this.get('image');

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
    },

    _handleSaveError: function (resp) {
        this.toggleProperty('submitting');
        if (resp && resp.jqXHR && resp.jqXHR.responseJSON && resp.jqXHR.responseJSON.errors) {
            this.set('flowErrors', resp.jqXHR.responseJSON.errors[0].message);
        } else {
            this.get('notifications').showAPIError(resp, {key: 'setup.blog-details'});
        }
    },

    _handleAuthenticationError: function (error) {
        this.toggleProperty('submitting');
        if (error && error.errors) {
            this.set('flowErrors', error.errors[0].message);
        } else {
            // Connection errors don't return proper status message, only req.body
            this.get('notifications').showAlert('There was a problem on the server.', {type: 'error', key: 'setup.authenticate.failed'});
        }
    },

    actions: {
        preValidate: function (model) {
            // Only triggers validation if a value has been entered, preventing empty errors on focusOut
            if (this.get(model)) {
                this.validate({property: model});
            }
        },

        setup: function () {
            var self = this,
                setupProperties = ['blogTitle', 'name', 'email', 'password', 'image'],
                data = self.getProperties(setupProperties),
                notifications = this.get('notifications'),
                config = this.get('config'),
                method = this.get('blogCreated') ? 'PUT' : 'POST';

            this.toggleProperty('submitting');
            this.set('flowErrors', '');

            this.get('hasValidated').addObjects(setupProperties);
            this.validate().then(function () {
                ajax({
                    url: self.get('ghostPaths.url').api('authentication', 'setup'),
                    type: method,
                    data: {
                        setup: [{
                            name: data.name,
                            email: data.email,
                            password: data.password,
                            blogTitle: data.blogTitle
                        }]
                    }
                }).then(function (result) {
                    config.set('blogTitle', data.blogTitle);
                    // Don't call the success handler, otherwise we will be redirected to admin
                    self.get('application').set('skipAuthSuccessHandler', true);
                    self.get('session').authenticate('authenticator:oauth2', self.get('email'), self.get('password')).then(function () {
                        self.set('blogCreated', true);
                        if (data.image) {
                            self.sendImage(result.users[0])
                            .then(function () {
                                self.toggleProperty('submitting');
                                self.transitionToRoute('setup.three');
                            }).catch(function (resp) {
                                self.toggleProperty('submitting');
                                notifications.showAPIError(resp, {key: 'setup.blog-details'});
                            });
                        } else {
                            self.toggleProperty('submitting');
                            self.transitionToRoute('setup.three');
                        }
                    }).catch(function (error) {
                        self._handleAuthenticationError(error);
                    });
                }).catch(function (error) {
                    self._handleSaveError(error);
                });
            }).catch(function () {
                self.toggleProperty('submitting');
                self.set('flowErrors', 'Please fill out the form to setup your blog.');
            });
        },
        setImage: function (image) {
            this.set('image', image);
        }
    }
});
