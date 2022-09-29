import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

const DISPLAY_OPTIONS = [{
    name: 'Free signups',
    value: 'signups'
}, {
    name: 'Paid conversions',
    value: 'paid'
}];

export default class Recents extends Component {
    @service dashboardStats;
    @tracked sortColumn = 'signups';
    displayOptions = DISPLAY_OPTIONS;

    @action
    onDisplayChange(selected) {
        this.sortColumn = selected.value;
    }

    @action
    setSortColumn(column) {
        this.sortColumn = column;
    }

    @action
    loadData() {
        this.dashboardStats.loadMemberAttributionStats();
    }

    get selectedDisplayOption() {
        return this.displayOptions.find(d => d.value === this.sortColumn) ?? this.displayOptions[0];
    }

    get sources() {
        return this.dashboardStats?.memberSourceAttributionCounts || [];
    }

    // chartDays value for more than 7 days has an extra day to show all ticks
    get chartPeriod() {
        if (this.dashboardStats.chartDays > 7) {
            return this.dashboardStats.chartDays - 1;
        }

        return this.dashboardStats.chartDays;
    }

    get chartSources() {
        const counts = this.dashboardStats?.memberSourceAttributionCounts || [];
        // filter null source from the list
        return counts.filter(source => source.source);
    }

    get areMembersEnabled() {
        return this.dashboardStats.siteStatus?.membersEnabled;
    }

    get areNewslettersEnabled() {
        return this.dashboardStats.siteStatus?.newslettersEnabled;
    }
}
