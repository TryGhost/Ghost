import Component from '@glimmer/component';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';

export default class PostsRestoreComponent extends Component {
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
            console.error('Failed to restore post:', error);
            return false;
        }
    }
}