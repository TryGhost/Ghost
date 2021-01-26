import ModalBase from 'ghost-admin/components/modal-base';
import classic from 'ember-classic-decorator';
import {action} from '@ember/object';
import {tracked} from '@glimmer/tracking';

// TODO: update modals to work fully with Glimmer components
@classic
export default class ModalPostPreviewComponent extends ModalBase {
    @tracked tab = 'browser';

    @action
    changeTab(tab) {
        this.tab = tab;
    }

    @action
    close() {
        this.closeModal();
    }

    actions = {
        confirm() {
            // noop - needed to override ModalBase.actions.confirm
        },

        // needed because ModalBase uses .send() for keyboard events
        closeModal() {
            this.closeModal();
        }
    }
}
