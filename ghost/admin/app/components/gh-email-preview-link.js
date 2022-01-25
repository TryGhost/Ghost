import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

export default class GhEmailPreviewLink extends Component {
    @service modals;

    @action
    openPreview(event) {
        event.preventDefault();
        return this.modals.open('modals/email-preview', this.args.data);
    }
}
