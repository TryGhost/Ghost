export default function mockStats(server) {
    server.get('/stats/subscriptions/', function () {
        return {
            stats: [],
            meta: {
                cadences: [],
                tiers: [],
                totals: []
            }
        };
    });

    server.get('/stats/member_count/', function () {
        return {
            stats: [
                {
                    date: '2022-04-18',
                    paid: 0,
                    free: 2,
                    comped: 0,
                    paid_subscribed: 0,
                    paid_canceled: 0
                },
                {
                    date: '2022-04-19',
                    paid: 0,
                    free: 2,
                    comped: 0,
                    paid_subscribed: 2,
                    paid_canceled: 0
                },
                {
                    date: '2022-04-28',
                    paid: 0,
                    free: 12,
                    comped: 0,
                    paid_subscribed: 0,
                    paid_canceled: 0
                },
                {
                    date: '2022-05-02',
                    paid: 0,
                    free: 35,
                    comped: 0,
                    paid_subscribed: 0,
                    paid_canceled: 0
                },
                {
                    date: '2022-05-10',
                    paid: 0,
                    free: 38,
                    comped: 1,
                    paid_subscribed: 0,
                    paid_canceled: 0
                }
            ],
            meta: {
                totals: {
                    paid: 0,
                    free: 38,
                    comped: 1
                }
            }
        };
    });
}
