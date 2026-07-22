import Component from '@glimmer/component';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';

export default class DeletePostModal extends Component {
    @service notifications;
    @service router;

    @task({drop: true})
    *deletePostTask() {
        try {
            const {post} = this.args.data;

            if (post.isDeleted) {
                return true;
            }

            // clear the data store and post of any unsaved client-generated tags before deleting
            post.updateTags();
            yield post.destroyRecord();

            this.notifications.closeAlerts('post.delete');
            this.router.transitionTo(post.displayName === 'page' ? 'pages' : 'posts');
            return true;
        } catch (error) {
            this.notifications.showAPIError(error, {key: 'post.delete.failed'});
        } finally {
            this.args.close();
        }
    }
}
