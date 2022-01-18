import Component from '@glimmer/component';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

export default class DashboardLatestMemberActivityComponent extends Component {
    @service membersActivity;
    @service session;
    @service settings;

    @tracked eventsData = null;
    @tracked eventsError = null;
    @tracked eventsLoading = false;

    get shouldDisplay() {
        const isOwner = this.session.user?.isOwnerOnly;
        const hasCompletedLaunchWizard = this.settings.get('editorIsLaunchComplete');

        if (isOwner && !hasCompletedLaunchWizard) {
            return false;
        }

        return true;
    }

    constructor() {
        super(...arguments);

        if (this.shouldDisplay) {
            this.loadEvents();
        }
    }

    async loadEvents() {
        try {
            this.eventsLoading = true;
            const {events} = await this.membersActivity.fetchTimeline({limit: 5});
            this.eventsData = events;
        } catch (error) {
            this.eventsError = error;
        } finally {
            this.eventsLoading = false;
        }
    }
}
