import ModalComponent from 'ghost/components/modals/base';

export default ModalComponent.extend({

    submitting: false,

    user: null,

    actions: {
        confirm() {
            this.set('submitting', true);

            this.attrs.confirm().finally(() => {
                this.send('closeModal');
            });
        }
    }
});
