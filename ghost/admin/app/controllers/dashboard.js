import Controller from '@ember/controller';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';

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

    daysOptions = DAYS_OPTIONS;

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
