import ModalComponent from 'ghost-admin/components/modal-base';
import copyTextToClipboard from 'ghost-admin/utils/copy-text-to-clipboard';
import {inject} from 'ghost-admin/decorators/inject';
import {task, timeout} from 'ember-concurrency';

export default ModalComponent.extend({
    config: inject(),

    copySiteUrl: task(function* () {
        copyTextToClipboard(this.config.blogUrl);
        yield timeout(1000);
        return true;
    })

});