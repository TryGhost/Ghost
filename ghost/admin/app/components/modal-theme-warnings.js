import ModalComponent from 'ghost-admin/components/modal-base';
import {reads} from '@ember/object/computed';

export default ModalComponent.extend({
    'data-test-theme-warnings-modal': true,

    title: reads('model.title'),
    message: reads('model.message'),
    warnings: reads('model.warnings'),
    errors: reads('model.errors'),
    fatalErrors: reads('model.fatalErrors'),
    canActivate: reads('model.canActivate'),

    actions: {
        confirm() {
            this.send('closeModal');
        }
    }
});
