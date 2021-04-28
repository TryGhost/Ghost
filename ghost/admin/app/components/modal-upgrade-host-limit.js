import ModalComponent from 'ghost-admin/components/modal-base';
import {computed} from '@ember/object';
import {inject as service} from '@ember/service';

export default ModalComponent.extend({
    router: service(),

    upgradeMessage: computed('details', function () {
        const {limit, total} = this.model.details;
        return {limit, total};
    }),
    actions: {
        upgrade: function () {
            this.router.transitionTo('pro');
        }
    }
});
