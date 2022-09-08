import Component from '@glimmer/component';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';

export default class DeleteWebhookModal extends Component {
    @service notifications;
    @service router;

    @task({drop: true})
    *deleteWebhookTask() {
        try {
            const {webhook} = this.args.data;

            if (webhook.isDeleted) {
                return true;
            }

            yield webhook.destroyRecord();

            this.notifications.closeAlerts('webhook.delete');
            return true;
        } catch (error) {
            this.notifications.showAPIError(error, {key: 'webhook.delete.failed'});
        } finally {
            this.args.close();
        }
    }
}
