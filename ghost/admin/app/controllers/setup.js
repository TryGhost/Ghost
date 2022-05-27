import classic from 'ember-classic-decorator';
import {inject as service} from '@ember/service';
/* eslint-disable camelcase, ghost/ember/alias-model-in-controller */
import Controller, {inject as controller} from '@ember/controller';
import ValidationEngine from 'ghost-admin/mixins/validation-engine';
import {action} from '@ember/object';
import {htmlSafe} from '@ember/template';
import {isInvalidError} from 'ember-ajax/errors';
import {isVersionMismatchError} from 'ghost-admin/services/ajax';
import {task} from 'ember-concurrency';

@classic
export default class SetupController extends Controller.extend(ValidationEngine) {
    @controller application;

    @service ajax;
    @service config;
    @service ghostPaths;
    @service notifications;
    @service router;
    @service session;

    // ValidationEngine settings
    validationType = 'setup';

    blogCreated = false;
    blogTitle = null;
    email = '';
    flowErrors = '';
    name = null;
    password = null;

    @action
    setup() {
        this.setupTask.perform();
    }

    @action
    preValidate(model) {
        // Only triggers validation if a value has been entered, preventing empty errors on focusOut
        if (this.get(model)) {
            return this.validate({property: model});
        }
    }

    @task(function* () {
        return yield this._passwordSetup();
    })
        setupTask;

    @task(function* (authStrategy, authentication) {
        // we don't want to redirect after sign-in during setup
        this.session.skipAuthSuccessHandler = true;

        try {
            yield this.session.authenticate(authStrategy, ...authentication);

            this.errors.remove('session');

            return true;
        } catch (error) {
            if (error && error.payload && error.payload.errors) {
                if (isVersionMismatchError(error)) {
                    return this.notifications.showAPIError(error);
                }

                error.payload.errors.forEach((err) => {
                    err.message = htmlSafe(err.message);
                });

                this.set('flowErrors', error.payload.errors[0].message.string);
            } else {
                // Connection errors don't return proper status message, only req.body
                this.notifications.showAlert('There was a problem on the server.', {type: 'error', key: 'session.authenticate.failed'});
            }

            return false;
        }
    })
        authenticate;

    _passwordSetup() {
        let setupProperties = ['blogTitle', 'name', 'email', 'password'];
        let data = this.getProperties(setupProperties);
        let config = this.config;
        let method = this.blogCreated ? 'put' : 'post';

        this.set('flowErrors', '');

        this.hasValidated.addObjects(setupProperties);

        return this.validate().then(() => {
            let authUrl = this.get('ghostPaths.url').api('authentication', 'setup');

            return this.ajax[method](authUrl, {
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
                    return this._afterAuthentication(result);
                }

                // Don't call the success handler, otherwise we will be redirected to admin
                this.session.skipAuthSuccessHandler = true;

                return this.session.authenticate('authenticator:cookie', data.email, data.password).then(() => {
                    this.set('blogCreated', true);
                    return this._afterAuthentication(result);
                }).catch((error) => {
                    this._handleAuthenticationError(error);
                });
            }).catch((error) => {
                this._handleSaveError(error);
            });
        }).catch(() => {
            this.set('flowErrors', 'Please fill out every field correctly to set up your site.');
        });
    }

    _handleSaveError(resp) {
        if (isInvalidError(resp)) {
            let [error] = resp.payload.errors;
            this.set('flowErrors', [error.message, error.context].join(' '));
        } else {
            this.notifications.showAPIError(resp, {key: 'setup.blog-details'});
        }
    }

    _handleAuthenticationError(error) {
        if (error && error.payload && error.payload.errors) {
            let [apiError] = error.payload.errors;
            this.set('flowErrors', [apiError.message, apiError.context].join(' '));
        } else {
            // Connection errors don't return proper status message, only req.body
            this.notifications.showAlert('There was a problem on the server.', {type: 'error', key: 'setup.authenticate.failed'});
        }
    }

    async _afterAuthentication() {
        await this.session.handleAuthentication();

        return this.router.transitionTo('setup.done');
    }
}
