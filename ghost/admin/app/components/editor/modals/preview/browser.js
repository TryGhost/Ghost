import Component from '@glimmer/component';
import copyTextToClipboard from 'ghost-admin/utils/copy-text-to-clipboard';
import {task, timeout} from 'ember-concurrency';

export default class ModalPostPreviewBrowserComponent extends Component {
    @task
    *copyPreviewUrl() {
        copyTextToClipboard(this.args.post.previewUrl);
        yield timeout(this.isTesting ? 50 : 3000);
    }
}
