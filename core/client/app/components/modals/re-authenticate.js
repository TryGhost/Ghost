import Ember from 'ember';
import ModalComponent from 'ghost/components/modals/base';
import ValidationEngine from 'ghost/mixins/validation-engine';

const {
    $,
    computed,
    inject: {service}
} = Ember;

export default ModalComponent.extend(ValidationEngine, {
    validationType: 'signin',

    submitting: false,
    authenticationError: null,

    notifications: service(),
    session: service(),

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
                            err.message = Ember.String.htmlSafe(err.message);
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
