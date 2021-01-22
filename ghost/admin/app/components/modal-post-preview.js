import ModalBase from 'ghost-admin/components/modal-base';
import classic from 'ember-classic-decorator';
import {action} from '@ember/object';
import {tracked} from '@glimmer/tracking';

// TODO: update modals to work fully with Glimmer components
@classic
export default class ModalPostPreviewComponent extends ModalBase {
    @tracked tab = 'desktop';

    @action
    changeTab(tab) {
        this.tab = tab;
    }

    @action
    close() {
        this.closeModal();
    }
}
