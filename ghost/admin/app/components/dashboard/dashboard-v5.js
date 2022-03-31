import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

const DAYS_OPTIONS = [{
    name: '7 days',
    value: 7
}, {
    name: '30 days',
    value: 30
}, {
    name: '90 days',
    value: 90
}, {
    name: 'All time',
    value: 'all'
}];

export default class DashboardDashboardV5Component extends Component {
    @service dashboardStats;

    daysOptions = DAYS_OPTIONS;

    get days() {
        return this.dashboardStats.chartDays;
    }

    set days(days) {
        this.dashboardStats.chartDays = days;
    }

    @action
    onInsert() {
        this.dashboardStats.loadSiteStatus();
    }

    get selectedDaysOption() {
        return this.daysOptions.find(d => d.value === this.days);
    }

    get isLoading() {
        return this.dashboardStats.siteStatus === null;
    }

    get hasPaidTiers() {
        return this.dashboardStats.siteStatus?.hasPaidTiers;
    }

    get isStripeEnabled() {
        return this.dashboardStats.siteStatus?.stripeEnabled;
    }    

    get areNewslettersEnabled() {
        return this.dashboardStats.siteStatus?.newslettersEnabled;
    }

    get areMembersEnabled() {
        return this.dashboardStats.siteStatus?.membersEnabled;
    }

    @action 
    onDaysChange(selected) {
        this.days = selected.value;
    }
}
