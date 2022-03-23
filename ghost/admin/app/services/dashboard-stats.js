import Service, {inject as service} from '@ember/service';
import moment from 'moment';
import {tracked} from '@glimmer/tracking';

export default class DashboardStatsService extends Service {
    @service dashboardMocks;

    @tracked
        memberCounts = null;

    @tracked
        memberCountStats = [];

    @tracked
        mrrStats = [];

    @tracked
        membersLastSeen30d = null;

    @tracked
        membersLastSeen7d = null;

    @tracked
        newsletterSubscribers = null;

    @tracked
        emailsSent30d = null;

    @tracked
        emailOpenRateStats = null;

    loadMembersCounts() {
        if (this.dashboardMocks.enabled) {
            this.memberCounts = this.dashboardMocks.memberCounts;
            return;
        }
        // Normal implementation
        // @todo
    }

    /**
     * Loads the members graphs
     * - total paid
     * - total members
     * for each day in the last {{days}} days
     * @param {number} days The number of days to fetch data for
     */
    loadMemberCountStats(days) {
        if (this.dashboardMocks.enabled) {
            this.memberCountStats = this.fillMissingDates(this.dashboardMocks.memberCountStats.slice(-days), {paid: 0,free: 0,comped: 0}, days);
            return;
        }

        // Normal implementation
        // @todo
    }

    /**
     * Loads the mrr graphs
     * @param {number} days The number of days to fetch data for
     */
    loadMrrStats(days) {
        if (this.dashboardMocks.enabled) {
            this.mrrStats = this.fillMissingDates(this.dashboardMocks.mrrStats.slice(-days), {mrr: 0}, days);
            return;
        }

        // Normal implementation
        // @todo
    }

    loadLastSeen() {
        if (this.dashboardMocks.enabled) {
            this.membersLastSeen30d = this.dashboardMocks.membersLastSeen30d;
            this.membersLastSeen7d = this.dashboardMocks.membersLastSeen7d;
            return;
        }
        // Normal implementation
        // @todo
    }

    /**
     * For now this is only used when reloading all the graphs after changing the mocked data
     * @todo: reload only data that we loaded earlier
     */
    reloadAll(days) {
        this.loadMembersCounts();
        this.loadMrrStats(days);
        this.loadMemberCountStats(days);
        this.loadLastSeen();
    }

    /**
     * Fill data to match a given amount of days
     */
    fillMissingDates(data, defaultData, days) {
        let currentRangeDate = moment().subtract(days, 'days');

        let endDate = moment().add(1, 'hour');
        const output = [];
        const firstDateInRangeIndex = data.findIndex((val) => {
            return moment(val.date).isAfter(currentRangeDate);
        });
        let initialDateInRangeVal = firstDateInRangeIndex > 0 ? data[firstDateInRangeIndex - 1] : null;
        if (firstDateInRangeIndex === 0 && !initialDateInRangeVal) {
            initialDateInRangeVal = data[firstDateInRangeIndex];
        }
        if (data.length > 0 && !initialDateInRangeVal && firstDateInRangeIndex !== 0) {
            initialDateInRangeVal = data[data.length - 1];
        }

        let lastVal = initialDateInRangeVal ? initialDateInRangeVal : defaultData;

        while (currentRangeDate.isBefore(endDate)) {
            let dateStr = currentRangeDate.format('YYYY-MM-DD');
            const dataOnDate = data.find(d => d.date === dateStr);
            lastVal = dataOnDate ? dataOnDate : lastVal;
            output.push(lastVal);
            currentRangeDate = currentRangeDate.add(1, 'day');
        }
        return output;
    }
}
