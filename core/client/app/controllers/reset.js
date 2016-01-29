import Ember from 'ember';
import ValidationEngine from 'ghost/mixins/validation-engine';

const {
    Controller,
    computed,
    inject: {service}
} = Ember;

export default Controller.extend(ValidationEngine, {
    newPassword: '',
    ne2Password: '',
    token: '',
    submitting: false,
    flowErrors: '',

    validationType: 'reset',

    ghostPaths: service(),
    notifications: service(),
    session: service(),
    ajax: service(),

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

    actions: {
        submit() {
            let credentials = this.getProperties('newPassword', 'ne2Password', 'token');

            this.set('flowErrors', '');
            this.get('hasValidated').addObjects(['newPassword', 'ne2Password']);
            this.validate().then(() => {
                let authUrl = this.get('ghostPaths.url').api('authentication', 'passwordreset');
                this.toggleProperty('submitting');
                this.get('ajax').put(authUrl, {
                    data: {
                        passwordreset: [credentials]
                    }
                }).then((resp) => {
                    this.toggleProperty('submitting');
                    this.get('notifications').showAlert(resp.passwordreset[0].message, {type: 'warn', delayed: true, key: 'password.reset'});
                    this.get('session').authenticate('authenticator:oauth2', this.get('email'), credentials.newPassword);
                }).catch((error) => {
                    this.get('notifications').showAPIError(error, {key: 'password.reset'});
                    this.toggleProperty('submitting');
                });
            }).catch((error) => {
                if (this.get('errors.newPassword')) {
                    this.set('flowErrors', this.get('errors.newPassword')[0].message);
                }

                if (this.get('errors.ne2Password')) {
                    this.set('flowErrors', this.get('errors.ne2Password')[0].message);
                }

                if (this.get('errors.length') === 0) {
                    throw error;
                }
            });
        }
    }
});
