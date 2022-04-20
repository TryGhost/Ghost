import Component from '@glimmer/component';
import PublishFlowModal from '../modals/editor-labs/publish-flow';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

export default class PublishFlow extends Component {
    @service modals;

    publishFlowModal = null;

    willDestroy() {
        super.willDestroy(...arguments);
        this.publishFlowModal?.close();
    }

    @action
    openPublishFlow() {
        this.publishFlowModal = this.modals.open(PublishFlowModal);
    }
}
