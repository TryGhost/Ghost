import Component from '@glimmer/component';
import EmberObject from '@ember/object';
import ValidationEngine from 'ghost-admin/mixins/validation-engine';
import classic from 'ember-classic-decorator';
import {action} from '@ember/object';
import {htmlSafe} from '@ember/template';
import {isVersionMismatchError} from 'ghost-admin/services/ajax';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

// EmberObject is still needed here for ValidationEngine
@classic
class Signin extends EmberObject.extend(ValidationEngine) {
    @tracked identification = '';
    @tracked password = '';

    validationType = 'signin';
}

export default class ReAuthenticateModal extends Component {
    @service notifications;
    @service session;
    @service modals;

    static modalOptions = {
        className: 'fullscreen-modal-wide fullscreen-modal-action modal-reauthenticate',
        ignoreBackdropClick: true,
        backgroundLight: true,
        backgroundBlur: true
    };

    @tracked authenticationError = null;

    constructor() {
        super(...arguments);
        this.signin = Signin.create();
        this.signin.identification = this.session.user.email;
    }

    @action
    setPassword(event) {
        this.signin.password = event.target.value;
    }

    @task({drop: true})
    *reauthenticateTask() {
        // Manually trigger events for input fields, ensuring legacy compatibility with
        // browsers and password managers that don't send proper events on autofill
        const inputs = document.querySelectorAll('#login input');
        inputs.forEach(input => input.dispatchEvent(new Event('change')));

        this.authenticationError = null;

        try {
            yield this.signin.validate({property: 'signin'});
        } catch (error) {
            this.signin.hasValidated.pushObject('password');
            return false;
        }

        try {
            yield this._authenticate();
            this.notifications.closeAlerts();
            this.args.close();
            return true;
        } catch (error) {
            if (!error) {
                return;
            }

            if (error?.payload?.errors) {
                error.payload.errors.forEach((err) => {
                    if (isVersionMismatchError(err)) {
                        return this.notifications.showAPIError(error);
                    }
                    err.message = htmlSafe(err.context || err.message);
                });

                this.signin.errors.add('password', 'Incorrect password');
                this.signin.hasValidated.pushObject('password');
                this.authenticationError = error.payload.errors[0].message;
            }

            this.notifications.showAPIError(error);
        }
    }

    async _authenticate() {
        const authStrategy = 'authenticator:cookie';
        const {identification, password} = this.signin;

        this.session.skipAuthSuccessHandler = true;

        try {
            await this.session.authenticate(authStrategy, identification, password);
        } finally {
            this.session.skipAuthSuccessHandler = undefined;
        }
    }
}
