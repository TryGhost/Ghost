import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

export default class Recents extends Component {
    @service dashboardStats;
    @tracked sortColumn = 'signups';

    @action
    setSortColumn(column) {
        this.sortColumn = column;
    }

    @action
    loadData() {
        this.dashboardStats.loadMemberAttributionStats();
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
