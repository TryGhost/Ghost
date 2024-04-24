import ModalComponent from 'ghost-admin/components/modal-base';
import {inject as service} from '@ember/service';

export default class ModalMemberTier extends ModalComponent {
    @service whatsNew;

    // actions = {
    //     confirm() { },
    //     // needed because ModalBase uses .send() for keyboard events
    //     closeModal() {
    //         this.close();
    //     }
    // };
}