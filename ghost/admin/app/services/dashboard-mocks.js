import Service from '@ember/service';
import {tracked} from '@glimmer/tracking';

/**
 * Service that contains fake data to be used by the DashboardStatsService if useMocks is enabled
 */
export default class DashboardMocksService extends Service {
    @tracked
        enabled = true;

    @tracked
        memberCounts = null;

    @tracked
        memberCountStats = [];

    @tracked
        mrrStats = [];

    @tracked
        membersLastSeen30d = 123;

    @tracked
        membersLastSeen7d = 51;

    @tracked
        newsletterSubscribers = null;

    @tracked
        emailsSent30d = null;

    @tracked
        emailOpenRateStats = null;

    /**
     * This method generates new data and forces a reload for all the charts
     * Might be better to move this code to a temporary mocking service
     */
    updateMockedData({days}) {    
        const generateDays = days;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - generateDays + 1);
    
        const stats = [];
        let growPeriod = true;
        let growCount = 0;
        let growLength = Math.floor(Math.random() * 14);
        let growRate = 10;

        for (let index = 0; index < generateDays; index++) {
            const date = new Date(startDate.getTime());
            date.setDate(date.getDate() + index);

            const previous = stats.length ? stats[stats.length - 1] : {free: 0, paid: 0, comped: 0};

            stats.push({
                date: date.toISOString().split('T')[0],
                free: index === 0 ? 0 : Math.max(0, previous.free + Math.floor(Math.random() * (growRate))),
                paid: index === 0 ? 0 : Math.max(0, previous.paid + Math.floor(Math.random() * (growRate - 3))),
                comped: 0
            });

            if (growPeriod) {
                growCount += 1;
                if (growCount > growLength) {
                    growPeriod = false;
                    growCount = 0;
                    growLength = Math.floor(Math.random() * 90) + 20;
                }
            } else {
                growCount += 1;
                if (growCount > growLength) {
                    growPeriod = true;
                    growCount = 0;
                    growLength = Math.floor(Math.random() * 90) + 20;
                }
            }

            if (growPeriod) {
                if (growRate < Math.min(100, previous.free / 10)) {
                    growRate *= 1.01;
                }
            } else {
                if (growRate > 2) {
                    growRate *= 0.99;
                }
            }
        }

        this.memberCountStats = stats;
        this.memberCounts = {
            total: stats[stats.length - 1].paid + stats[stats.length - 1].free + stats[stats.length - 1].comped,
            paid: stats[stats.length - 1].paid,
            free: stats[stats.length - 1].free + stats[stats.length - 1].comped
        };

        this.mrrStats = stats.map((s) => {
            return {
                date: s.date,
                mrr: s.paid * 5
            };
        });
    }
}
