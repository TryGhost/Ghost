import $ from 'jquery';
import computed from 'ember-computed';
import injectService from 'ember-service/inject';
import {htmlSafe} from 'ember-string';
import ModalComponent from 'ghost-admin/components/modals/base';
import ValidationEngine from 'ghost-admin/mixins/validation-engine';
import {isVersionMismatchError} from 'ghost-admin/services/ajax';

export default ModalComponent.extend(ValidationEngine, {
    validationType: 'signin',

    submitting: false,
    authenticationError: null,

    notifications: injectService(),
    session: injectService(),

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

    actions: {
        confirm() {
            // Manually trigger events for input fields, ensuring legacy compatibility with
            // browsers and password managers that don't send proper events on autofill
            $('#login').find('input').trigger('change');

            this.set('authenticationError', null);

            this.validate({property: 'signin'}).then(() => {
                this._authenticate().then(() => {
                    this.get('notifications').closeAlerts('post.save');
                    this.send('closeModal');
                }).catch((error) => {
                    if (error && error.errors) {
                        error.errors.forEach((err) => {
                            if (isVersionMismatchError(err)) {
                                return this.get('notifications').showAPIError(error);
                            }
                            err.message = htmlSafe(err.message);
                        });

                        this.get('errors').add('password', 'Incorrect password');
                        this.get('hasValidated').pushObject('password');
                        this.set('authenticationError', error.errors[0].message);
                    }
                });
            }, () => {
                this.get('hasValidated').pushObject('password');
            });
        }
    }
});
