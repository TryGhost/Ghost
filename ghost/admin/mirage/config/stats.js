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

    server.get('/stats/referrers/', function () {
        return {
            stats: [],
            meta: {}
        };
    });

    server.get('/stats/mrr/', function () {
        return {
            stats: [
                {
                    date: '2025-01-08',
                    mrr: 18333,
                    currency: 'usd'
                },
                {
                    date: '2025-01-09',
                    mrr: 18749,
                    currency: 'usd'
                },
                {
                    date: '2025-02-19',
                    mrr: 8749,
                    currency: 'usd'
                },
                {
                    date: '2025-03-05',
                    mrr: 416,
                    currency: 'usd'
                },
                {
                    date: '2025-03-27',
                    mrr: 832,
                    currency: 'usd'
                }
            ],
            meta: {
                totals: [
                    {
                        currency: 'usd',
                        mrr: 832
                    }
                ]
            }
        };
    });
}
