import Component from '@glimmer/component';
import {action} from '@ember/object';
import {tracked} from '@glimmer/tracking';

export default class PublishModalComponent extends Component {
    static modalOptions = {
        className: 'fullscreen-modal-total-overlay',
        omitBackdrop: true,
        ignoreBackdropClick: true
    };

    @tracked isConfirming = false;

    @action
    toggleConfirm() {
        // TODO: validate?
        this.isConfirming = !this.isConfirming;
    }
}
