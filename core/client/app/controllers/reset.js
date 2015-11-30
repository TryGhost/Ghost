import Ember from 'ember';
import {request as ajax} from 'ic-ajax';
import ValidationEngine from 'ghost/mixins/validation-engine';

const {Controller, computed, inject} = Ember;

export default Controller.extend(ValidationEngine, {
    newPassword: '',
    ne2Password: '',
    token: '',
    submitting: false,
    flowErrors: '',

    validationType: 'reset',

    ghostPaths: inject.service('ghost-paths'),
    notifications: inject.service(),
    session: inject.service(),

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
            this.get('hasValidated').addObjects((['newPassword', 'ne2Password']));
            this.validate().then(() => {
                this.toggleProperty('submitting');
                ajax({
                    url: this.get('ghostPaths.url').api('authentication', 'passwordreset'),
                    type: 'PUT',
                    data: {
                        passwordreset: [credentials]
                    }
                }).then((resp) => {
                    this.toggleProperty('submitting');
                    this.get('notifications').showAlert(resp.passwordreset[0].message, {type: 'warn', delayed: true, key: 'password.reset'});
                    this.get('session').authenticate('authenticator:oauth2', this.get('email'), credentials.newPassword);
                }).catch((response) => {
                    this.get('notifications').showAPIError(response, {key: 'password.reset'});
                    this.toggleProperty('submitting');
                });
            }).catch(() => {
                if (this.get('errors.newPassword')) {
                    this.set('flowErrors', this.get('errors.newPassword')[0].message);
                }

                if (this.get('errors.ne2Password')) {
                    this.set('flowErrors', this.get('errors.ne2Password')[0].message);
                }
            });
        }
    }
});
