import Component from '@glimmer/component';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';

export default class DeleteIntegrationModal extends Component {
    @service notifications;
    @service router;

    @task({drop: true})
    *deleteIntegrationTask() {
        try {
            const {integration} = this.args.data;

            if (integration.isDeleted) {
                return true;
            }

            yield integration.destroyRecord();

            this.notifications.closeAlerts('integration.delete');
            this.router.transitionTo('settings.integrations');
            return true;
        } catch (error) {
            this.notifications.showAPIError(error, {key: 'integration.delete.failed'});
        } finally {
            this.args.close();
        }
    }
}
