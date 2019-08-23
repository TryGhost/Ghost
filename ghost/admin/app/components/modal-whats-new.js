import ModalComponent from 'ghost-admin/components/modal-base';
import {inject as service} from '@ember/service';

export default ModalComponent.extend({
    whatsNew: service(),

    confirm() {}
});
