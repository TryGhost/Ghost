import ModalComponent from 'ghost-admin/components/modal-base';

export default ModalComponent.extend({
    actions: {
        upgrade: function () {
            const upgradeLink = this.model.upgradeLink;
            window.open(upgradeLink);
            this.closeModal();
            return true;
        }
    }
});
