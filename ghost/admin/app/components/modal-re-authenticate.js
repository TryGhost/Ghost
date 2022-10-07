import ModalComponent from 'ghost-admin/components/modal-base';
import ValidationEngine from 'ghost-admin/mixins/validation-engine';
import {htmlSafe} from '@ember/template';
import {isVersionMismatchError} from 'ghost-admin/services/ajax';
import {reads} from '@ember/object/computed';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';

export default ModalComponent.extend(ValidationEngine, {
    config: service(),
    notifications: service(),
    session: service(),

    validationType: 'signin',

    authenticationError: null,

    identification: reads('session.user.email'),

    actions: {
        confirm() {
            this.reauthenticate.perform();
        }
    },

    _authenticate() {
        let session = this.session;
        let authStrategy = 'authenticator:cookie';
        let identification = this.identification;
        let password = this.password;

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
        const inputs = document.querySelectorAll('#login input');
        inputs.forEach(input => input.dispatchEvent(new Event('change')));

        this.set('authenticationError', null);

        return this.validate({property: 'signin'}).then(() => this._authenticate().then(() => {
            this.notifications.closeAlerts();
            this.send('closeModal');
            return true;
        }).catch((error) => {
            if (error && error.payload && error.payload.errors) {
                error.payload.errors.forEach((err) => {
                    if (isVersionMismatchError(err)) {
                        return this.notifications.showAPIError(error);
                    }
                    err.message = htmlSafe(err.context || err.message);
                });

                this.errors.add('password', 'Incorrect password');
                this.hasValidated.pushObject('password');
                this.set('authenticationError', error.payload.errors[0].message);
            }
        }), () => {
            this.hasValidated.pushObject('password');
            return false;
        });
    },

    reauthenticate: task(function* () {
        return yield this._passwordConfirm();
    }).drop()
});
