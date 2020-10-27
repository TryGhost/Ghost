import ModalComponent from 'ghost-admin/components/modal-base';

export default ModalComponent.extend({
    actions: {
        confirm() {
            this.confirm();
            this.send('closeModal');
        }
    }
});
