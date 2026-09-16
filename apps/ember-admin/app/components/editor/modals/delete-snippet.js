import Component from '@glimmer/component';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';

export default class DeleteSnippetModal extends Component {
    @service notifications;

    @task({drop: true})
    *deleteSnippetTask() {
        try {
            const {snippet} = this.args.data;

            if (snippet.isDeleted) {
                return true;
            }

            yield snippet.destroyRecord();

            this.notifications.closeAlerts('snippet.delete');
            return true;
        } catch (error) {
            this.notifications.showAPIError(error, {key: 'snippet.delete.failed'});
        } finally {
            this.args.close();
        }
    }
}
