import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

export default class AnnouncementSettingsVisibilityComponent extends Component {
    @service settings;
    @service membersUtils;

    visibilityOptions = {
        freeMembers: 'free_members',
        paidMembers: 'paid_members',
        visitors: 'visitors'
    };

    get visibilitySettings() {
        return this.settings.announcementVisibility || [];
    }

    get isPaidAvailable() {
        return this.membersUtils.isStripeEnabled;
    }

    get isFreeMembersChecked() {
        return this.visibilitySettings.includes(this.visibilityOptions.freeMembers);
    }

    get isPaidMembersChecked() {
        return this.visibilitySettings.includes(this.visibilityOptions.paidMembers);
    }

    get isVisitorsChecked() {
        return this.visibilitySettings.includes(this.visibilityOptions.visitors);
    }

    get isMembersEnabled() {
        return this.settings.membersEnabled;
    }

    @action
    updateVisibility(event) {
        let updatedVisibilityOptions = [...this.visibilitySettings];
        const value = event.target.value;

        if (event.target.checked) {
            updatedVisibilityOptions.push(value);
        } else {
            updatedVisibilityOptions = updatedVisibilityOptions.filter(item => item !== value);
        }

        this.settings.announcementVisibility = updatedVisibilityOptions;
        // update preview if there are no visibility options or just one to avoid update flickering on every check
        if (!updatedVisibilityOptions.length || updatedVisibilityOptions.length === 1) {
            this.args.onChange?.();
        }
    }
}
