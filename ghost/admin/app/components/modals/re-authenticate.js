import $ from 'jquery';
import ModalComponent from 'ghost-admin/components/modals/base';
import ValidationEngine from 'ghost-admin/mixins/validation-engine';
import computed from 'ember-computed';
import injectService from 'ember-service/inject';
import {htmlSafe} from 'ember-string';
import {isVersionMismatchError} from 'ghost-admin/services/ajax';
import {task} from 'ember-concurrency';

export default ModalComponent.extend(ValidationEngine, {
    validationType: 'signin',

    authenticationError: null,

    config: injectService(),
    notifications: injectService(),
    session: injectService(),
    torii: injectService(),

    identification: computed('session.user.email', function () {
        return this.get('session.user.email');
    }),

    _authenticate() {
        let session = this.get('session');
        let authStrategy = 'authenticator:oauth2';
        let identification = this.get('identification');
        let password = this.get('password');

        session.set('skipAuthSuccessHandler', true);

        this.toggleProperty('submitting');

        return session.authenticate(authStrategy, identification, password).finally(() => {
            this.toggleProperty('submitting');
            session.set('skipAuthSuccessHandler', undefined);
        });
    },

    _passwordConfirm() {
        // Manually trigger events for input fields, ensuring legacy compatibility with
        // browsers and password managers that don't send proper events on autofill
        $('#login').find('input').trigger('change');

        this.set('authenticationError', null);

        return this.validate({property: 'signin'}).then(() => {
            return this._authenticate().then(() => {
                this.get('notifications').closeAlerts();
                this.send('closeModal');
                return true;
            }).catch((error) => {
                if (error && error.errors) {
                    error.errors.forEach((err) => {
                        if (isVersionMismatchError(err)) {
                            return this.get('notifications').showAPIError(error);
                        }
                        err.message = htmlSafe(err.context || err.message);
                    });

                    this.get('errors').add('password', 'Incorrect password');
                    this.get('hasValidated').pushObject('password');
                    this.set('authenticationError', error.errors[0].message);
                }
            });
        }, () => {
            this.get('hasValidated').pushObject('password');
            return false;
        });
    },

    _oauthConfirm() {
        // TODO: remove duplication between signin/signup/re-auth
        let authStrategy = 'authenticator:oauth2-ghost';

        this.toggleProperty('submitting');
        this.set('authenticationError', '');

        return this.get('torii')
            .open('ghost-oauth2', {type: 'signin'})
            .then((authentication) => {
                this.get('session').set('skipAuthSuccessHandler', true);

                this.get('session').authenticate(authStrategy, authentication).finally(() => {
                    this.get('session').set('skipAuthSuccessHandler', undefined);

                    this.toggleProperty('submitting');
                    this.get('notifications').closeAlerts();
                    this.send('closeModal');
                });
            })
            .catch(() => {
                this.toggleProperty('submitting');
                this.set('authenticationError', 'Authentication with Ghost.org denied or failed');
            });
    },

    reauthenticate: task(function* () {
        if (this.get('config.ghostOAuth')) {
            return yield this._oauthConfirm();
        } else {
            return yield this._passwordConfirm();
        }
    }).drop(),

    actions: {
        confirm() {
            this.get('reauthenticate').perform();
        }
    }
});
