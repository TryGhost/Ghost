import Component from '@glimmer/component';
import EmailPreviewModal from './modals/email-preview';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

export default class GhEmailPreviewLink extends Component {
    @service modals;

    @action
    openPreview(event) {
        event.preventDefault();
        return this.modals.open(EmailPreviewModal, this.args.data);
    }
}
