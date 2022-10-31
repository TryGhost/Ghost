import Component from '@glimmer/component';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';

export default class DeleteAllContentModal extends Component {
    @service ajax;
    @service ghostPaths;
    @service notifications;
    @service router;
    @service store;

    @task({drop: true})
    *deleteAllTask() {
        try {
            const deleteUrl = this.ghostPaths.url.api('db');
            yield this.ajax.del(deleteUrl);

            this.store.unloadAll('post');
            this.store.unloadAll('tag');

            this.notifications.showAlert('All content deleted from database.', {type: 'success', key: 'all-content.delete.success'});
        } catch (error) {
            this.notifications.showAPIError(error, {key: 'all-content.delete'});
        } finally {
            this.args.close();
        }
    }
}
