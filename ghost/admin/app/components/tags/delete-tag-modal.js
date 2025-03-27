import Component from '@glimmer/component';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';

export default class DeleteTagModal extends Component {
    @service notifications;
    @service router;

    @task({drop: true})
    *deleteTagTask() {
        try {
            const {tag} = this.args.data;

            if (tag.isDeleted) {
                return true;
            }

            yield tag.destroyRecord();

            this.notifications.closeAlerts('tag.delete');
            this.router.transitionTo('tags');
            return true;
        } catch (error) {
            this.notifications.showAPIError(error, {key: 'tag.delete.failed'});
        } finally {
            this.args.close();
        }
    }
}
