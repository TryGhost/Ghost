import Component from '@glimmer/component';
import {action} from '@ember/object';
import {debounce} from '@ember/runloop';
import {inject as service} from '@ember/service';

export default class AnnouncementSettingsContentComponent extends Component {
    @service settings;

    get content() {
        return this.settings.announcementContent;
    }

    updatePreview() {
        debounce(this, this.args.onChange, 300);
    }

    @action
    setContent(html) {
        this.settings.announcementContent = html;
        this.settings.save();
        this.updatePreview();
    }
}
