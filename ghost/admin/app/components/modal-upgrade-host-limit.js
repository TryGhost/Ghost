import ModalComponent from 'ghost-admin/components/modal-base';
import {computed} from '@ember/object';
import {inject as service} from '@ember/service';

export default ModalComponent.extend({
    router: service(),

    headerMessage: computed('details', function () {
        let header = 'Upgrade to enable publishing';

        if (this.model.message && this.model.message.match(/account is currently in review/gi)) {
            header = `Hold up, we're migssing some details`;
        }

        return header;
    }),

    upgradeMessage: computed('details', function () {
        const {limit, total} = this.model.details || {};
        const message = this.model.message;

        return {limit, total, message};
    }),

    actions: {
        upgrade() {
            this.router.transitionTo('pro');
        },

        confirm() {
            this.send('upgrade');
        }
    }
});
