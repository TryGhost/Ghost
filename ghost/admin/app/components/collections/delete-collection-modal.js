import Component from '@glimmer/component';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';

export default class DeleteCollectionModal extends Component {
    @service notifications;
    @service router;

    @task({drop: true})
    *deleteCollectionTask() {
        try {
            const {collection} = this.args.data;

            if (collection.isDeleted) {
                return true;
            }

            yield collection.destroyRecord();

            this.notifications.closeAlerts('collection.delete');
            this.router.transitionTo('collections');
            return true;
        } catch (error) {
            this.notifications.showAPIError(error, {key: 'collection.delete.failed'});
        } finally {
            this.args.close();
        }
    }
}
