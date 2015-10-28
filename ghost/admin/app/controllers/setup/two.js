import Ember from 'ember';
import {request as ajax} from 'ic-ajax';
import ValidationEngine from 'ghost/mixins/validation-engine';

const {Controller, RSVP, inject} = Ember;

export default Controller.extend(ValidationEngine, {
    size: 90,
    blogTitle: null,
    name: null,
    email: '',
    password: null,
    image: null,
    blogCreated: false,
    submitting: false,
    flowErrors: '',

    ghostPaths: inject.service('ghost-paths'),
    notifications: inject.service(),
    application: inject.controller(),
    config: inject.service(),
    session: inject.service(),

    // ValidationEngine settings
    validationType: 'setup',

    /**
     * Uploads the given data image, then sends the changed user image property to the server
     * @param  {Object} user User object, returned from the 'setup' api call
     * @return {Ember.RSVP.Promise} A promise that takes care of both calls
     */
    sendImage(user) {
        let image = this.get('image');

        return new RSVP.Promise((resolve, reject) => {
            image.formData = {};
            image.submit()
                .success(function (response) {
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
    },

    _handleSaveError(resp) {
        this.toggleProperty('submitting');
        if (resp && resp.jqXHR && resp.jqXHR.responseJSON && resp.jqXHR.responseJSON.errors) {
            this.set('flowErrors', resp.jqXHR.responseJSON.errors[0].message);
        } else {
            this.get('notifications').showAPIError(resp, {key: 'setup.blog-details'});
        }
    },

    _handleAuthenticationError(error) {
        this.toggleProperty('submitting');
        if (error && error.errors) {
            this.set('flowErrors', error.errors[0].message);
        } else {
            // Connection errors don't return proper status message, only req.body
            this.get('notifications').showAlert('There was a problem on the server.', {type: 'error', key: 'setup.authenticate.failed'});
        }
    },

    actions: {
        preValidate(model) {
            // Only triggers validation if a value has been entered, preventing empty errors on focusOut
            if (this.get(model)) {
                this.validate({property: model});
            }
        },

        setup() {
            let setupProperties = ['blogTitle', 'name', 'email', 'password', 'image'];
            let data = this.getProperties(setupProperties);
            let notifications = this.get('notifications');
            let config = this.get('config');
            let method = this.get('blogCreated') ? 'PUT' : 'POST';

            this.toggleProperty('submitting');
            this.set('flowErrors', '');

            this.get('hasValidated').addObjects(setupProperties);
            this.validate().then(() => {
                ajax({
                    url: this.get('ghostPaths.url').api('authentication', 'setup'),
                    type: method,
                    data: {
                        setup: [{
                            name: data.name,
                            email: data.email,
                            password: data.password,
                            blogTitle: data.blogTitle
                        }]
                    }
                }).then((result) => {
                    config.set('blogTitle', data.blogTitle);
                    // Don't call the success handler, otherwise we will be redirected to admin
                    this.get('application').set('skipAuthSuccessHandler', true);
                    this.get('session').authenticate('authenticator:oauth2', this.get('email'), this.get('password')).then(() => {
                        this.set('blogCreated', true);
                        if (data.image) {
                            this.sendImage(result.users[0])
                            .then(() => {
                                this.toggleProperty('submitting');
                                this.transitionToRoute('setup.three');
                            }).catch((resp) => {
                                this.toggleProperty('submitting');
                                notifications.showAPIError(resp, {key: 'setup.blog-details'});
                            });
                        } else {
                            this.toggleProperty('submitting');
                            this.transitionToRoute('setup.three');
                        }
                    }).catch((error) => {
                        this._handleAuthenticationError(error);
                    });
                }).catch((error) => {
                    this._handleSaveError(error);
                });
            }).catch(() => {
                this.toggleProperty('submitting');
                this.set('flowErrors', 'Please fill out the form to setup your blog.');
            });
        },

        setImage(image) {
            this.set('image', image);
        }
    }
});
