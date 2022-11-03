import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

export default class Analytics extends Component {
    @service settings;
    @service feature;

    @action
    toggleEmailTrackOpens(event) {
        if (event) {
            event.preventDefault();
        }
        this.settings.emailTrackOpens = !this.settings.emailTrackOpens;
    }

    @action
    toggleEmailTrackClicks(event) {
        if (event) {
            event.preventDefault();
        }
        this.settings.emailTrackClicks = !this.settings.emailTrackClicks;
    }

    @action
    toggleMembersTrackSources(event) {
        if (event) {
            event.preventDefault();
        }
        this.settings.membersTrackSources = !this.settings.membersTrackSources;
    }
}
