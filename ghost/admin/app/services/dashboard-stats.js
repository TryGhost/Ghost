import Service from '@ember/service';
import {tracked} from '@glimmer/tracking';

export default class DashboardStatsService extends Service {
    @tracked
        useMocks = true;

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
        if (this.useMocks) {
            this.memberCounts = this.mockedMemberCounts;
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
        if (this.useMocks) {
            this.memberCountStats = this.mockedMemberCountStats.slice(-days);
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
        if (this.useMocks) {
            this.mmrStats = this.mockedMrrStats.slice(-days);
            return;
        }

        // Normal implementation
        // @todo
    }

    loadLastSeen() {
        if (this.useMocks) {
            this.membersLastSeen30d = 620;
            this.membersLastSeen7d = 320;
            return;
        }
        // Normal implementation
        // @todo
    }

    // Mocked data (move this to a mocking service?)

    @tracked
        mockedMemberCountStats = [];

    @tracked
        mockedMrrStats = [];

    @tracked
        mockedMemberCounts = {
            total: 0,
            paid: 0,
            free: 0
        };
}
