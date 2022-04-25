import Component from '@glimmer/component';
import {action} from '@ember/object';

export default class PublishModalComponent extends Component {
    static modalOptions = {
        className: 'fullscreen-modal-total-overlay',
        omitBackdrop: true,
        ignoreBackdropClick: true
    };

    @action
    publishTypeChanged(event) {
        event.preventDefault();

        this.args.data.publishOptions.setPublishType(event.target.value);
    }
}
