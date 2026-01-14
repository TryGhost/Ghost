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

    server.post('/stats/posts-visitor-counts/', function (schema, request) {
        const requestBody = JSON.parse(request.requestBody);
        const postUuids = requestBody.postUuids || [];
        
        // Return mock visitor counts for the requested post UUIDs
        const visitorCounts = {};
        postUuids.forEach((uuid) => {
            visitorCounts[uuid] = Math.floor(Math.random() * 1000) + 100; // Random count between 100-1100
        });
        
        return {
            stats: [{
                data: {
                    visitor_counts: visitorCounts
                }
            }]
        };
    });

    server.post('/stats/posts-member-counts/', function (schema, request) {
        const requestBody = JSON.parse(request.requestBody);
        const postIds = requestBody.postIds || [];
        
        // Return mock member counts for the requested post IDs
        const memberCounts = {};
        postIds.forEach((id) => {
            memberCounts[id] = {
                free_members: Math.floor(Math.random() * 50) + 5, // Random count between 5-55
                paid_members: Math.floor(Math.random() * 20) + 1 // Random count between 1-21
            };
        });
        
        return {
            stats: [memberCounts]
        };
    });
}
