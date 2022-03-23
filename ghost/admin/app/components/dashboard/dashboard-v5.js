import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

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
    value: 365 // todo: add support for all time (not important for prototype)
}];

export default class DashboardDashboardV5Component extends Component {
    @service dashboardStats;
    @service dashboardMocks;

    @tracked mockPaidTiers = true;
    @tracked mockStripeEnabled = true;
    @tracked mockNewslettersEnabled = true;
    @tracked mockMembersEnabled = true;
    
    @tracked days = 30;

    daysOptions = DAYS_OPTIONS;

    constructor() {
        super(...arguments);
        //this.dashboardMocks.updateMockedData({days: 14});
    }

    get selectedDaysOption() {
        return this.daysOptions.find(d => d.value === this.days);
    }

    get hasPaidTiers() {
        return this.mockPaidTiers;
    }

    get isStripeEnabled() {
        return this.mockStripeEnabled;
    }    

    get areNewslettersEnabled() {
        return this.mockNewslettersEnabled;
    }

    get areMembersEnabled() {
        return this.mockMembersEnabled;
    }

    @action 
    onDaysChange(selected) {
        this.days = selected.value;
    }

    /**
     * This method generates new data and forces a reload for all the charts
     * Might be better to move this code to a temporary mocking service
     */
    @action
    updateMockedData(generateDays) {    
        this.dashboardMocks.updateMockedData({days: generateDays});

        // Force update all data
        this.dashboardStats.reloadAll(this.days);
    }
}
