import Component from '@glimmer/component';
import {capitalize} from '@ember/string';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

export default class RegenerateKeyModal extends Component {
    @service ajax;
    @service ghostPaths;
    @service notifications;
    @service store;

    @tracked errorMessage;

    @task({drop: true})
    *regenerateKeyTask() {
        const {integration, apiKey} = this.args.data;
        const url = this.ghostPaths.url.api('/integrations/', integration.id, 'api_key', apiKey.id, 'refresh');

        try {
            const response = yield this.ajax.post(url, {
                data: {
                    integrations: [{id: integration.id}]
                }
            });

            this.store.pushPayload(response);
            this.args.close(apiKey);
        } catch (e) {
            console.error(e); // eslint-disable-line
            this.errorMessage = `There was an error regenerating the ${capitalize(apiKey.type)} API Key. Please try again`;
            return;
        }
    }
}
