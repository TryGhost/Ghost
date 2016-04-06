import ModalComponent from 'ghost/components/modals/base';

export default ModalComponent.extend({
    user: null,
    submitting: false,

    actions: {
        confirm() {
            this.set('submitting', true);

            this.get('confirm')().finally(() => {
                this.send('closeModal');
            });
        }
    }
});
