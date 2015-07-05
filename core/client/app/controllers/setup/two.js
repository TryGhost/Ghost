/* global md5 */
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
    submitting: false,

    ghostPaths: Ember.inject.service('ghost-paths'),
    notifications: Ember.inject.service(),
    application: Ember.inject.controller(),

    gravatarUrl: Ember.computed('email', function () {
        var email = this.get('email'),
            size = this.get('size');

        return 'http://www.gravatar.com/avatar/' + md5(email) + '?s=' + size + '&d=blank';
    }),

    userImage: Ember.computed('gravatarUrl', function () {
        return this.get('image') || this.get('gravatarUrl');
    }),

    userImageBackground: Ember.computed('userImage', function () {
        return 'background-image: url(' + this.get('userImage') + ')';
    }),

    invalidMessage: 'The password fairy does not approve',

    // ValidationEngine settings
    validationType: 'setup',

    actions: {
        setup: function () {
            var self = this,
                data = self.getProperties('blogTitle', 'name', 'email', 'password'),
                notifications = this.get('notifications');

            this.toggleProperty('submitting');
            this.validate().then(function () {
                self.set('showError', false);
                ajax({
                    url: self.get('ghostPaths.url').api('authentication', 'setup'),
                    type: 'POST',
                    data: {
                        setup: [{
                            name: data.name,
                            email: data.email,
                            password: data.password,
                            blogTitle: data.blogTitle
                        }]
                    }
                }).then(function () {
                    // Don't call the success handler, otherwise we will be redirected to admin
                    self.get('application').set('skipAuthSuccessHandler', true);

                    self.get('session').authenticate('simple-auth-authenticator:oauth2-password-grant', {
                        identification: self.get('email'),
                        password: self.get('password')
                    }).then(function () {
                        self.set('password', '');
                        self.transitionToRoute('setup.three');
                    });
                }).catch(function (resp) {
                    self.toggleProperty('submitting');
                    notifications.showAPIError(resp);
                });
            }).catch(function () {
                self.toggleProperty('submitting');
                self.set('showError', true);
            });
        }
    }
});
