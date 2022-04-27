import Component from '@glimmer/component';
import {action} from '@ember/object';
import {tracked} from '@glimmer/tracking';

export default class PublishModalComponent extends Component {
    static modalOptions = {
        className: 'fullscreen-modal-total-overlay',
        omitBackdrop: true,
        ignoreBackdropClick: true
    };

    @tracked openSection = null;

    @action
    toggleSection(section) {
        if (section === this.openSection) {
            this.openSection = null;
        } else {
            this.openSection = section;
        }
    }
}
