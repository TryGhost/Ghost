import ModalComponent from 'ghost-admin/components/modal-base';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

export default class ModalMemberTier extends ModalComponent {
    @service whatsNew;

    @action
    close(event) {
        event?.preventDefault?.();
        this.closeModal();
    }

    actions = {
        confirm() {
            this.confirmAction(...arguments);
        },
        // needed because ModalBase uses .send() for keyboard events
        closeModal() {
            this.close();
        }
    };
}