import Controller from 'ember-controller';
import ValidationEngine from 'ghost-admin/mixins/validation-engine';
import computed from 'ember-computed';
import injectService from 'ember-service/inject';
import {task} from 'ember-concurrency';

export default Controller.extend(ValidationEngine, {
    newPassword: '',
    ne2Password: '',
    token: '',
    flowErrors: '',

    validationType: 'reset',

    ghostPaths: injectService(),
    notifications: injectService(),
    session: injectService(),
    ajax: injectService(),

    email: computed('token', function () {
        // The token base64 encodes the email (and some other stuff),
        // each section is divided by a '|'. Email comes second.
        return atob(this.get('token')).split('|')[1];
    }),

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
        let authUrl = this.get('ghostPaths.url').api('authentication', 'passwordreset');

        this.set('flowErrors', '');
        this.get('hasValidated').addObjects(['newPassword', 'ne2Password']);

        try {
            yield this.validate();
            try {
                let resp = yield this.get('ajax').put(authUrl, {
                    data: {
                        passwordreset: [credentials]
                    }
                });
                this.get('notifications').showAlert(resp.passwordreset[0].message, {type: 'warn', delayed: true, key: 'password.reset'});
                this.get('session').authenticate('authenticator:oauth2', this.get('email'), credentials.newPassword);
            } catch (error) {
                this.get('notifications').showAPIError(error, {key: 'password.reset'});
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
    }).drop(),

    actions: {
        submit() {
            this.get('resetPassword').perform();
        }
    }
});
