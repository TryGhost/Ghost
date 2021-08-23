import ModalComponent from 'ghost-admin/components/modal-base';
import {alias} from '@ember/object/computed';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';

export default ModalComponent.extend({
    router: service(),
    notifications: service(),

    snippet: alias('model.snippetRecord'),

    actions: {
        confirm() {
            this.updateSnippet.perform();
        }
    },

    updateSnippet: task(function* () {
        try {
            yield this.confirm();
        } catch (error) {
            this.notifications.showAPIError(error, {key: 'snippet.update.failed'});
        } finally {
            this.send('closeModal');
        }
    }).drop()
});
