import ModalComponent from 'ghost-admin/components/modal-base';
import {computed} from '@ember/object';

export default ModalComponent.extend({
    upgradeMessage: computed('details', function () {
        const {limit, total} = this.model.details;
        return {limit, total};
    }),
    actions: {
        upgrade: function () {
            const upgradeLink = this.model.upgradeLink;
            window.open(upgradeLink);
            this.closeModal();
            return true;
        }
    }
});
