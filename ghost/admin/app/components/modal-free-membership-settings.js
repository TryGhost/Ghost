import ModalBase from 'ghost-admin/components/modal-base';
import classic from 'ember-classic-decorator';
import {action} from '@ember/object';

// TODO: update modals to work fully with Glimmer components
@classic
export default class ModalFreeMembershipSettings extends ModalBase {
    init() {
        super.init(...arguments);
    }

    @action
    close(event) {
        event?.preventDefault?.();
        this.closeModal();
    }

    actions = {
        // needed because ModalBase uses .send() for keyboard events
        closeModal() {
            this.close();
        }
    }
}
