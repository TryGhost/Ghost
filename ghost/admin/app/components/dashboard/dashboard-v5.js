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

    @tracked mockPaidTiers = true;
    @tracked mockStripeEnabled = true;
    @tracked mockNewslettersEnabled = true;
    @tracked mockMembersEnabled = true;
    
    @tracked days = 30;

    daysOptions = DAYS_OPTIONS;

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
    updateMockedData(days) {    
        const generateDays = days;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - generateDays + 1);
    
        const stats = [];
        let growPeriod = true;
        let growCount = 0;
        let growLength = Math.floor(Math.random() * 14);
        for (let index = 0; index < generateDays; index++) {
            const date = new Date(startDate.getTime());
            date.setDate(date.getDate() + index);

            const previous = stats.length ? stats[stats.length - 1] : {free: 0, paid: 0, comped: 0};

            stats.push({
                date: date.toISOString().split('T')[0],
                free: previous.free + (growPeriod ? (index + Math.floor(Math.random() * (previous.free) * 0.01)) : 0),
                paid: previous.paid + Math.floor(Math.random() * (previous.free) * 0.005),
                comped: previous.comped + Math.floor(Math.random() * 1)
            });

            if (growPeriod) {
                growCount += 1;
                if (growCount > growLength) {
                    growPeriod = false;
                    growCount = 0;
                    growLength = Math.floor(Math.random() * 14);
                }
            } else {
                growCount += 1;
                if (growCount > growLength) {
                    growPeriod = true;
                    growCount = 0;
                    growLength = Math.floor(Math.random() * 14);
                }
            }
        }

        this.dashboardStats.mockedMemberCountStats = stats;

        this.dashboardStats.mockedMemberCounts = {
            total: stats[stats.length - 1].paid + stats[stats.length - 1].free + stats[stats.length - 1].comped,
            paid: stats[stats.length - 1].paid,
            free: stats[stats.length - 1].free + stats[stats.length - 1].comped
        };

        // Force update all data
        this.dashboardStats.loadMembersCounts();
        this.dashboardStats.loadMrrStats(this.days);
        this.dashboardStats.loadMemberCountStats(this.days);
        this.dashboardStats.loadLastSeen();
    }
}
