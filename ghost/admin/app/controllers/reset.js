/* eslint-disable ghost/ember/alias-model-in-controller */
import Controller from '@ember/controller';
import ValidationEngine from 'ghost-admin/mixins/validation-engine';
import {action} from '@ember/object';
import {inject} from 'ghost-admin/decorators/inject';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

export default class ResetController extends Controller.extend(ValidationEngine) {
    @service ghostPaths;
    @service notifications;
    @service session;
    @service ajax;

    @inject config;

    @tracked newPassword = '';
    @tracked ne2Password = '';
    @tracked token = '';
    @tracked flowErrors = '';

    validationType = 'reset';

    get email() {
        // The token base64 encodes the email (and some other stuff),
        // each section is divided by a '|'. Email comes second.
        return atob(this.token).split('|')[1];
    }

    // Used to clear sensitive information
    clearData() {
        this.newPassword = '';
        this.ne2Password = '';
        this.token = '';

        document.querySelector('form#reset')?.reset();
    }

    @action
    handleInput(event) {
        this.flowErrors = '';
        this.errors.clear();
        this.hasValidated.addObjects(['newPassword', 'ne2Password']);

        this[event.currentTarget.name] = event.target.value;
    }

    @task({drop: true})
    *resetPasswordTask() {
        const {email, newPassword, ne2Password, token} = this;
        const authUrl = this.ghostPaths.url.api('authentication', 'password_reset');

        this.flowErrors = '';
        this.hasValidated.addObjects(['newPassword', 'ne2Password']);

        try {
            yield this.validate();
            try {
                let resp = yield this.ajax.put(authUrl, {
                    data: {
                        password_reset: [{newPassword, ne2Password, token}]
                    }
                });
                this.notifications.showNotification(
                    resp.password_reset[0].message,
                    {type: 'info', delayed: true, key: 'password.reset'}
                );
                this.session.authenticate('authenticator:cookie', email, newPassword);
                return true;
            } catch (error) {
                this.notifications.showAPIError(error, {key: 'password.reset'});
            }
        } catch (error) {
            if (this.errors.errorsFor('newPassword').length) {
                this.flowErrors = this.errors.errorsFor('newPassword')[0].message;
            }

            if (this.errors.errorsFor('ne2Password').length) {
                this.flowErrors = this.errors.errorsFor('ne2Password')[0].message;
            }

            if (error && this.errors.length === 0) {
                throw error;
            }
        }
    }
}
