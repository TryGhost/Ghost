import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';

export default class ConfirmDeleteThemeModal extends Component {
    @service ghostPaths;
    @service notifications;
    @service utils;

    @action
    downloadTheme(event) {
        event.preventDefault();
        this.utils.downloadFile(`${this.ghostPaths.apiRoot}/themes/${this.args.data.theme.name}/download/`);
    }

    @task
    *deleteThemeTask() {
        try {
            yield this.args.data.theme.destroyRecord();
            // we need to unload from the store here so that uploading another
            // theme with the same "id" doesn't attempt to update the deleted record
            this.args.data.theme.unloadRecord();
            this.args.close();
            return true;
        } catch (error) {
            // TODO: show error in modal rather than generic message
            this.notifications.showAPIError(error);
        }
    }
}
