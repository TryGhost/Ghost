import Component from '@glimmer/component';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

export default class DashboardLatestMemberActivityComponent extends Component {
    @service dataCache;
    @service feature;
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
        const limit = 5;
        const filter = this.feature.membersActivity ?
            'type:-[email_delivered_event,email_opened_event,email_failed_event]' :
            '';

        const dataKey = `dashboard-member-activity::${JSON.stringify({limit, filter})}`;

        if (this.dataCache.get(dataKey)) {
            this.eventsData = this.dataCache.get(dataKey);
            return;
        }

        try {
            this.eventsLoading = true;
            const {events} = await this.membersActivity.fetchTask.perform({limit, filter});
            this.eventsData = events;

            const ONE_MINUTE = 1 * 60 * 1000;
            this.dataCache.set(dataKey, events, ONE_MINUTE);
        } catch (error) {
            this.eventsError = error;
        } finally {
            this.eventsLoading = false;
        }
    }
}
