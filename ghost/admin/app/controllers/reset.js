/* eslint-disable ghost/ember/alias-model-in-controller */
import Controller from '@ember/controller';
import ValidationEngine from 'ghost-admin/mixins/validation-engine';
import {computed} from '@ember/object';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';

export default Controller.extend(ValidationEngine, {
    ghostPaths: service(),
    notifications: service(),
    session: service(),
    ajax: service(),
    config: service(),

    newPassword: '',
    ne2Password: '',
    token: '',
    flowErrors: '',

    validationType: 'reset',

    email: computed('token', function () {
        // The token base64 encodes the email (and some other stuff),
        // each section is divided by a '|'. Email comes second.
        return atob(this.token).split('|')[1];
    }),

    actions: {
        submit() {
            return this.resetPassword.perform();
        }
    },

    // Used to clear sensitive information
    clearData() {
        this.setProperties({
            newPassword: '',
            ne2Password: '',
            token: ''
        });
    },

    resetPassword: task(function* () {
        let credentials = this.getProperties('newPassword', 'ne2Password', 'token');
        let authUrl = this.get('ghostPaths.url').api('authentication', 'password_reset');

        this.set('flowErrors', '');
        this.hasValidated.addObjects(['newPassword', 'ne2Password']);

        try {
            yield this.validate();
            try {
                let resp = yield this.ajax.put(authUrl, {
                    data: {
                        password_reset: [credentials]
                    }
                });
                this.notifications.showAlert(resp.password_reset[0].message, {type: 'warn', delayed: true, key: 'password.reset'});
                this.session.authenticate('authenticator:cookie', this.email, credentials.newPassword);
                return true;
            } catch (error) {
                this.notifications.showAPIError(error, {key: 'password.reset'});
            }
        } catch (error) {
            if (this.get('errors.newPassword')) {
                this.set('flowErrors', this.get('errors.newPassword')[0].message);
            }

            if (this.get('errors.ne2Password')) {
                this.set('flowErrors', this.get('errors.ne2Password')[0].message);
            }

            if (error && this.get('errors.length') === 0) {
                throw error;
            }
        }
    }).drop()
});
