import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

const STATE_OPTIONS = [
    {
        name: 'No data',
        value: {
            days: 0
        }
    }, 
    {
        name: '7 days',
        value: {
            days: 7
        }
    }, 
    {
        name: '30 days',
        value: {
            days: 30
        }
    }, 
    {
        name: '90 days',
        value: {
            days: 90
        }
    }, 
    {
        name: 'One year',
        value: {
            days: 365
        } 
    }, 
    {
        name: 'Two years',
        value: {
            days: 730
        } 
    }
];

export default class PrototypeControlPanel extends Component {
    @service dashboardStats;
    @service dashboardMocks;
    
    stateOptions = STATE_OPTIONS;

    @tracked state = STATE_OPTIONS[1].value;

    @action
    onInsert() {
        this.loadState();
        this.dashboardMocks.updateMockedData(this.state);
        // Don't reload all (because then we would load unused graphs too)
    }

    saveState() {
        try {
            localStorage.setItem('dashboard5-prototype-state', JSON.stringify(this.state));
            localStorage.setItem('dashboard5-prototype-status', JSON.stringify(this.dashboardMocks.siteStatus));
        } catch (e) {
            // ignore localStorage not supported errors
        }
    }

    loadState() {
        try {
            const savedState = localStorage.getItem('dashboard5-prototype-state');
            if (savedState) {
                const parsed = JSON.parse(savedState);
                if (parsed) {
                    this.state = parsed;
                }
            }

            const savedStatus = localStorage.getItem('dashboard5-prototype-status');
            if (savedStatus) {
                const parsed = JSON.parse(savedStatus);
                if (parsed) {
                    this.dashboardMocks.siteStatus = {...this.dashboardMocks.siteStatus, ...parsed};
                    //this.dashboardStats.loadSiteStatus();
                }
            }
        } catch (e) {
            // ignore localStorage not supported errors
        }
    }

    get selectedStateOption() {
        return this.stateOptions.find(option => option.value.days === this.state.days);
    }

    @action 
    onStateChange(option) {
        this.state = option.value;
        this.updateMockedData();
        this.saveState();
    }

    @action
    updateMockedData() {    
        this.dashboardMocks.updateMockedData(this.state);

        // Force update all data
        this.dashboardStats.reloadAll();
    }

    // Convenience mappers

    get mockPaidTiers() {
        return this.dashboardMocks.siteStatus?.hasPaidTiers;
    }

    set mockPaidTiers(val) {
        this.dashboardMocks.siteStatus.hasPaidTiers = val;
        this.dashboardStats.loadSiteStatus();
        this.saveState();
    }

    get mockStripeEnabled() {
        return this.dashboardMocks.siteStatus?.stripeEnabled;
    }

    set mockStripeEnabled(val) {
        this.dashboardMocks.siteStatus.stripeEnabled = val;
        this.dashboardStats.loadSiteStatus();
        this.saveState();
    }

    get mockNewslettersEnabled() {
        return this.dashboardMocks.siteStatus?.newslettersEnabled;
    }

    set mockNewslettersEnabled(val) {
        this.dashboardMocks.siteStatus.newslettersEnabled = val;
        this.dashboardStats.loadSiteStatus();
        this.saveState();
    }

    get mockMembersEnabled() {
        return this.dashboardMocks.siteStatus?.membersEnabled;
    }

    set mockMembersEnabled(val) {
        this.dashboardMocks.siteStatus.membersEnabled = val;
        this.dashboardStats.loadSiteStatus();
        this.saveState();
    }
}
