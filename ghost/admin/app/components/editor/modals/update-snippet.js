import Component from '@glimmer/component';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';

export default class UpdateSnippetModal extends Component {
    @service notifications;

    @task({drop: true})
    *updateSnippetTask() {
        const {snippet, updatedProperties: {mobiledoc, lexical}} = this.args.data;

        try {
            if (mobiledoc) {
                snippet.mobiledoc = mobiledoc;
            }
            if (lexical) {
                snippet.lexical = lexical;

                if (!snippet.mobiledoc) {
                    snippet.mobiledoc = {};
                }
            }

            yield snippet.save();

            this.notifications.closeAlerts('snippet.save');
            this.notifications.showNotification(
                `Snippet "${snippet.name}" updated`,
                {type: 'success'}
            );

            return snippet;
        } catch (error) {
            if (!snippet.errors.isEmpty) {
                this.notifications.showAlert(
                    `Snippet save failed: ${snippet.errors.messages.join('. ')}`,
                    {type: 'error', key: 'snippet.save'}
                );
            }
            snippet.rollbackAttributes();
            throw error;
        } finally {
            this.args.close();
        }
    }
}
