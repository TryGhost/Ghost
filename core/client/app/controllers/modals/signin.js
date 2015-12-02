import Ember from 'ember';
import ValidationEngine from 'ghost/mixins/validation-engine';

const {$, Controller, computed, inject} = Ember;

export default Controller.extend(ValidationEngine, {
    validationType: 'signin',
    submitting: false,

    application: inject.controller(),
    notifications: inject.service(),
    session: inject.service(),

    identification: computed('session.user.email', function () {
        return this.get('session.user.email');
    }),

    actions: {
        authenticate() {
            let appController = this.get('application');
            let authStrategy = 'authenticator:oauth2';

            appController.set('skipAuthSuccessHandler', true);

            this.get('session').authenticate(authStrategy, this.get('identification'), this.get('password')).then(() => {
                this.send('closeModal');
                this.set('password', '');
                this.get('notifications').closeAlerts('post.save');
            }).catch(() => {
                // if authentication fails a rejected promise will be returned.
                // it needs to be caught so it doesn't generate an exception in the console,
                // but it's actually "handled" by the sessionAuthenticationFailed action handler.
            }).finally(() => {
                this.toggleProperty('submitting');
                appController.set('skipAuthSuccessHandler', undefined);
            });
        },

        validateAndAuthenticate() {
            this.toggleProperty('submitting');

            // Manually trigger events for input fields, ensuring legacy compatibility with
            // browsers and password managers that don't send proper events on autofill
            $('#login').find('input').trigger('change');

            this.validate({format: false}).then(() => {
                this.send('authenticate');
            }).catch((errors) => {
                this.get('notifications').showErrors(errors);
            });
        },

        confirmAccept() {
            this.send('validateAndAuthenticate');
        }
    }
});
