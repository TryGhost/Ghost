import ModalComponent from 'ghost-admin/components/modal-base';

export default ModalComponent.extend({
    actions: {
        // noop - we don't want the enter key doing anything
        confirm() {}
    }
});
