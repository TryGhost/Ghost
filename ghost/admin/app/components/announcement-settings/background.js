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
            {value: 'dark', label: 'Dark', className: 'kg-headerstyle-btn-dark'},
            {value: 'light', label: 'Light', className: 'kg-headerstyle-btn-light'},
            {value: 'accent', label: 'Accent', className: 'kg-headerstyle-btn-accent'}
        ];
    }

    @action
    setBackground(value) {
        this.settings.announcementBackground = value;
        this.args.onChange?.();
    }
}
