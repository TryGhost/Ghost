import Controller from '@ember/controller';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

// Options 30 and 90 need an extra day to be able to distribute ticks/gridlines evenly
const DAYS_OPTIONS = [{
    name: '7 Days',
    value: 7
}, {
    name: '30 Days',
    value: 30 + 1
}, {
    name: '90 Days',
    value: 90 + 1
}];

export default class DashboardController extends Controller {
    @service dashboardStats;
    @service membersUtils;
    @service store;
    @service mentionUtils;
    @service feature;

    @tracked mentions = [];
    @tracked hasNewMentions = false;

    daysOptions = DAYS_OPTIONS;

    @action
    async loadMentions() {
        if (!this.feature.get('webmentions')) {
            return;
        }
        this.mentions = await this.store.query('mention', {unique: true, limit: 5, order: 'created_at desc'});
        this.hasNewMentions = this.checkHasNewMentions();

        // Load grouped mentions
        await this.mentionUtils.loadGroupedMentions(this.mentions);
    }

    checkHasNewMentions() {
        if (!this.mentions) {
            return false;
        }
        const firstMention = this.mentions.firstObject;
        if (!firstMention) {
            return false;
        }

        try {
            const lastId = localStorage.getItem('lastMentionRead');
            return firstMention.id !== lastId;
        } catch (e) {
            // localstorage disabled or not supported
        }
        return true;
    }

    @action
    markMentionsRead() {
        try {
            if (this.mentions) {
                const firstMention = this.mentions.firstObject;
                if (firstMention) {
                    localStorage.setItem('lastMentionRead', firstMention.id);
                }
            }
        } catch (e) {
            // localstorage disabled or not supported
        }

        // The opening of the popup breaks if we change hasNewMentions inside the handling (propably due to a rerender, so we need to delay it)
        if (this.hasNewMentions) {
            setTimeout(() => {
                this.hasNewMentions = false;
            }, 20);
        }
        return true;
    }

    @task
    *loadSiteStatusTask() {
        yield this.dashboardStats.loadSiteStatus();
        return {};
    }

    @action
    onDaysChange(selected) {
        this.days = selected.value;
    }

    get days() {
        return this.dashboardStats.chartDays;
    }

    set days(days) {
        this.dashboardStats.chartDays = days;
    }

    get selectedDaysOption() {
        return this.daysOptions.find(d => d.value === this.days);
    }

    get isLoading() {
        return this.dashboardStats.siteStatus === null;
    }

    get totalMembers() {
        return this.dashboardStats.memberCounts?.total ?? 0;
    }

    get isTotalMembersZero() {
        return this.dashboardStats.memberCounts && this.totalMembers === 0;
    }

    get hasPaidTiers() {
        return this.dashboardStats.siteStatus?.hasPaidTiers;
    }

    get areNewslettersEnabled() {
        return this.dashboardStats.siteStatus?.newslettersEnabled;
    }

    get areMembersEnabled() {
        return this.dashboardStats.siteStatus?.membersEnabled;
    }
}
