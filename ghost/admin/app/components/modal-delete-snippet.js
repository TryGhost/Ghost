import ModalComponent from 'ghost-admin/components/modal-base';
import {alias} from '@ember/object/computed';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';

export default ModalComponent.extend({
    router: service(),
    notifications: service(),

    snippet: alias('model'),

    actions: {
        confirm() {
            this.deleteSnippet.perform();
        }
    },

    deleteSnippet: task(function* (snippet) {
        try {
            yield this.confirm(snippet);
        } catch (error) {
            this.notifications.showAPIError(error, {key: 'snippet.delete.failed'});
        } finally {
            this.send('closeModal');
        }
    }).drop()
});
