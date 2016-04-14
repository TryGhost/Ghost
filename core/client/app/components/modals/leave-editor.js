import ModalComponent from 'ghost/components/modals/base';

export default ModalComponent.extend({
    actions: {
        confirm() {
            this.get('confirm')().finally(() => {
                this.send('closeModal');
            });
        }
    }
});
