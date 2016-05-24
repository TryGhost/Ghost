import Ember from 'ember';
import ModalComponent from 'ghost-admin/components/modals/base';

export default ModalComponent.extend({
    actions: {
        updateEmail(newEmail) {
            this.set('model.email', newEmail);
            this.set('model.hasValidated', Ember.A());
            this.get('model.errors').clear();
        },

        confirm() {
            let confirmAction = this.get('confirm');

            this.set('submitting', true);

            confirmAction().then(() => {
                this.send('closeModal');
            }).catch((errors) => {
                let [error] = errors;
                if (error && error.match(/email/i)) {
                    this.get('model.errors').add('email', error);
                    this.get('model.hasValidated').pushObject('email');
                }
            }).finally(() => {
                if (!this.get('isDestroying') && !this.get('isDestroyed')) {
                    this.set('submitting', false);
                }
            });
        }
    }
});
