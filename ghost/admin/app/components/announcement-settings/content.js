import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

export default class AnnouncementSettingsContentComponent extends Component {
    @service feature;
    @service settings;

    get content() {
        return this.settings.announcementContent;
    }

    @action
    setContent(html) {
        this.settings.announcementContent = html;
    }
}
