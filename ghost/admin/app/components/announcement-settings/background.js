import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

export default class AnnouncementSettingsBackgroundComponent extends Component {
    @service settings;

    get background() {
        return this.settings.announcementBackground;
    }

    get options() {
        return [
            {value: 'accent', label: 'Accent'},
            {value: 'dark', label: 'Dark'},
            {value: 'light', label: 'Light'}
        ];
    }

    @action
    setBackground(event) {
        this.settings.announcementBackground = event.target.value;
        this.settings.save();
        this.args.onChange?.();
    }
}
