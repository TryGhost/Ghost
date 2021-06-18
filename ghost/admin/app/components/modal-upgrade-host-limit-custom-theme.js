import ModalComponent from 'ghost-admin/components/modal-base';
import {inject as service} from '@ember/service';

export default ModalComponent.extend({
    router: service(),

    actions: {
        upgrade() {
            this.router.transitionTo('pro');
        },

        confirm() {
            this.send('upgrade');
        }
    }
});
