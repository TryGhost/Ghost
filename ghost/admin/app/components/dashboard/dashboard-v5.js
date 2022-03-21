import Component from '@glimmer/component';
import {tracked} from '@glimmer/tracking';

export default class DashboardDashboardV5Component extends Component {
    @tracked mockPaidTiers = true;
    @tracked mockStripeEnabled = true;
    @tracked mockNewslettersEnabled = true;
    @tracked mockMembersEnabled = true;

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
}
