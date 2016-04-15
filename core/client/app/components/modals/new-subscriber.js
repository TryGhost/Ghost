import Ember from 'ember';
import ModalComponent from 'ghost/components/modals/base';

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
            }).finally(() => {
                if (!this.get('isDestroying') && !this.get('isDestroyed')) {
                    this.set('submitting', false);
                }
            });
        }
    }
});
