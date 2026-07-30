import Controller from '@ember/controller';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';

export default class RestorePostsController extends Controller {
    @service localRevisions;
    @service notifications;

    @task
    *restorePostTask(revision) {
        try {
            yield this.localRevisions.restore(revision.key);
            this.notifications.showNotification('Post restored successfully', {type: 'success'});
            return true;
        } catch (error) {
            this.notifications.showNotification('Failed to restore post', {type: 'error'});
            // eslint-disable-next-line no-console
            console.error('Failed to restore post:', error);
            return false;
        }
    }
}