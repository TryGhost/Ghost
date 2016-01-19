import Ember from 'ember';
import ValidationEngine from 'ghost/mixins/validation-engine';

const {
    Controller,
    RSVP: {Promise},
    inject: {service, controller},
    isArray
} = Ember;

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

    ghostPaths: service(),
    notifications: service(),
    application: controller(),
    config: service(),
    session: service(),
    ajax: service(),

    // ValidationEngine settings
    validationType: 'setup',

    /**
     * Uploads the given data image, then sends the changed user image property to the server
     * @param  {Object} user User object, returned from the 'setup' api call
     * @return {Ember.RSVP.Promise} A promise that takes care of both calls
     */
    sendImage(user) {
        let image = this.get('image');

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
    },

    _handleSaveError(resp) {
        this.toggleProperty('submitting');

        if (resp && resp.errors && isArray(resp.errors)) {
            this.set('flowErrors', resp.errors[0].message);
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

    afterAuthentication(result) {
        if (this.get('image')) {
            this.sendImage(result.users[0])
            .then(() => {
                this.toggleProperty('submitting');
                this.transitionToRoute('setup.three');
            }).catch((resp) => {
                this.toggleProperty('submitting');
                this.get('notifications').showAPIError(resp, {key: 'setup.blog-details'});
            });
        } else {
            this.toggleProperty('submitting');
            this.transitionToRoute('setup.three');
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
            let setupProperties = ['blogTitle', 'name', 'email', 'password'];
            let data = this.getProperties(setupProperties);
            let config = this.get('config');
            let method = this.get('blogCreated') ? 'put' : 'post';

            this.toggleProperty('submitting');
            this.set('flowErrors', '');

            this.get('hasValidated').addObjects(setupProperties);
            this.validate().then(() => {
                let authUrl = this.get('ghostPaths.url').api('authentication', 'setup');
                this.get('ajax')[method](authUrl, {
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

                    // don't try to login again if we are already logged in
                    if (this.get('session.isAuthenticated')) {
                        return this.afterAuthentication(result);
                    }

                    // Don't call the success handler, otherwise we will be redirected to admin
                    this.set('session.skipAuthSuccessHandler', true);
                    this.get('session').authenticate('authenticator:oauth2', this.get('email'), this.get('password')).then(() => {
                        this.set('blogCreated', true);
                        return this.afterAuthentication(result);
                    }).catch((error) => {
                        this._handleAuthenticationError(error);
                    }).finally(() => {
                        this.set('session.skipAuthSuccessHandler', undefined);
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
