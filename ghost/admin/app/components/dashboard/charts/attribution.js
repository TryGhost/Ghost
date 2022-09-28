import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

const DISPLAY_OPTIONS = [{
    name: 'Paid Conversions',
    value: 'paid'
}, {
    name: 'Signups',
    value: 'signups'
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
