import Component from '@glimmer/component';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency-decorators';

export default class DeletePostModalComponent extends Component {
    @service notifications;
    @service router;

    @task
    *deletePostTask() {
        try {
            const {post} = this.args.data;

            // clear the data store and post of any unsaved client-generated tags before deleting
            post.updateTags();
            yield post.destroyRecord();

            this.notifications.closeAlerts('post.delete');
            this.router.transitionTo(post.displayName === 'page' ? 'pages' : 'posts');
        } catch (error) {
            this.notifications.showAPIError(error, {key: 'post.delete.failed'});
        } finally {
            this.args.close();
        }
    }
}
