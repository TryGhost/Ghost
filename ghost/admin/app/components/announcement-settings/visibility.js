import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

export default class AnnouncementSettingsVisibilityComponent extends Component {
    @service settings;

    get visibility() {
        return this.settings.announcementVisibility;
    }

    get options() {
        return [
            {value: 'public', label: 'Public'},
            {value: 'visitors', label: 'Visitors'},
            {value: 'members', label: 'Members'},
            {value: 'paid', label: 'Paid'}
        ];
    }

    @action
    setVisibility(event) {
        this.settings.announcementVisibility = event.target.value;
        this.settings.save();
        this.args.onChange?.();
    }
}
