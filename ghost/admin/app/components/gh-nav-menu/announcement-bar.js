import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject} from 'ghost-admin/decorators/inject';
import {inject as service} from '@ember/service';

export default class AnnouncementBarMenuComponent extends Component {
    @service themeManagement;

    @inject config;

    @action
    updatePreview() {
        this.themeManagement.updatePreviewHtmlTask.perform();
    }
}
