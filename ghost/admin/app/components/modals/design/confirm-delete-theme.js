import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency-decorators';

export default class ConfirmDeleteThemeComponent extends Component {
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
            this.args.close();
            return true;
        } catch (error) {
            // TODO: show error in modal rather than generic message
            this.notifications.showAPIError(error);
        }
    }
}
