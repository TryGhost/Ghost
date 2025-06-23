const sinon = require('sinon');
const should = require('should');
const StatsService = require('../../../../../core/server/services/stats/StatsService');
const knex = require('knex').default;

describe('StatsService', function () {
    let service;
    let mockDeps;
    let mockMrrService;
    let mockMembersService;
    let mockSubscriptionsService;
    let mockReferrersService;
    let mockPostsService;
    let mockContentService;

    beforeEach(function () {
        // Create mock services
        mockMrrService = {
            getHistory: sinon.stub().resolves({data: [], meta: {}})
        };

        mockMembersService = {
            getCountHistory: sinon.stub().resolves({data: [], meta: {}})
        };

        mockSubscriptionsService = {
            getSubscriptionHistory: sinon.stub().resolves({data: [], meta: {}})
        };

        mockReferrersService = {
            getReferrersHistory: sinon.stub().resolves({data: [], meta: {}}),
            getForPost: sinon.stub().resolves([]),
            getTopSourcesWithRange: sinon.stub().resolves({data: [], meta: {}})
        };

        mockPostsService = {
            getReferrersForPost: sinon.stub().resolves({data: [], meta: {}}),
            getTopPosts: sinon.stub().resolves({data: []}),
            getTopPostsViews: sinon.stub().resolves({data: []}),
            getGrowthStatsForPost: sinon.stub().resolves({data: {}, meta: {}}),
            getPostsMemberCounts: sinon.stub().resolves({data: []}),
            getNewsletterStats: sinon.stub().resolves({data: []}),
            getNewsletterSubscriberStats: sinon.stub().resolves({data: []}),
            getPostStats: sinon.stub().resolves({data: {}}),
            getPostsVisitorCounts: sinon.stub().resolves({}),
            getNewsletterBasicStats: sinon.stub().resolves({data: []}),
            getNewsletterClickStats: sinon.stub().resolves({data: []})
        };

        mockContentService = {
            getTopContent: sinon.stub().resolves({data: []})
        };

        mockDeps = {
            mrr: mockMrrService,
            members: mockMembersService,
            subscriptions: mockSubscriptionsService,
            referrers: mockReferrersService,
            posts: mockPostsService,
            content: mockContentService
        };

        // @ts-ignore - Using mocks for testing
        service = new StatsService(mockDeps);
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('factory method', function () {
        it('creates a StatsService instance with proper dependencies', function () {
            const db = knex({client: 'sqlite3', connection: {filename: ':memory:'}, useNullAsDefault: true});
            const createdService = StatsService.create({knex: db});
            
            should.exist(createdService);
            createdService.should.be.an.instanceOf(StatsService);
            should.exist(createdService.mrr);
            should.exist(createdService.members);
            should.exist(createdService.subscriptions);
            should.exist(createdService.referrers);
            should.exist(createdService.posts);
            should.exist(createdService.content);
        });
    });

    describe('delegation methods', function () {
        describe('getMRRHistory', function () {
            it('delegates to MRR service', async function () {
                const expectedResult = {data: [{date: '2023-01-01', mrr: 100}], meta: {}};
                mockMrrService.getHistory.resolves(expectedResult);

                const result = await service.getMRRHistory();

                result.should.eql(expectedResult);
                mockMrrService.getHistory.calledOnce.should.be.true();
            });
        });

        describe('getMemberCountHistory', function () {
            it('delegates to members service with mapped options', async function () {
                const expectedResult = {data: [{date: '2023-01-01', members: 50}], meta: {}};
                mockMembersService.getCountHistory.resolves(expectedResult);

                const options = {dateFrom: '2023-01-01', endDate: '2023-01-31'};
                const result = await service.getMemberCountHistory(options);

                result.should.eql(expectedResult);
                mockMembersService.getCountHistory.calledOnce.should.be.true();
                
                // Check that dateFrom was mapped to startDate
                const calledOptions = mockMembersService.getCountHistory.firstCall.args[0];
                calledOptions.should.have.property('startDate', '2023-01-01');
                calledOptions.should.have.property('endDate', '2023-01-31');
                calledOptions.should.not.have.property('dateFrom');
            });

            it('works with empty options', async function () {
                const expectedResult = {data: [], meta: {}};
                mockMembersService.getCountHistory.resolves(expectedResult);

                const result = await service.getMemberCountHistory();

                result.should.eql(expectedResult);
                mockMembersService.getCountHistory.calledOnce.should.be.true();
            });
        });

        describe('getSubscriptionCountHistory', function () {
            it('delegates to subscriptions service', async function () {
                const expectedResult = {data: [{date: '2023-01-01', subscriptions: 25}], meta: {}};
                mockSubscriptionsService.getSubscriptionHistory.resolves(expectedResult);

                const result = await service.getSubscriptionCountHistory();

                result.should.eql(expectedResult);
                mockSubscriptionsService.getSubscriptionHistory.calledOnce.should.be.true();
            });
        });

        describe('getReferrersHistory', function () {
            it('delegates to referrers service', async function () {
                const expectedResult = {data: [{source: 'google', signups: 10}], meta: {}};
                mockReferrersService.getReferrersHistory.resolves(expectedResult);

                const result = await service.getReferrersHistory();

                result.should.eql(expectedResult);
                mockReferrersService.getReferrersHistory.calledOnce.should.be.true();
            });
        });

        describe('getPostReferrers', function () {
            it('delegates to referrers service and wraps result', async function () {
                const mockData = [{source: 'facebook', signups: 5}];
                mockReferrersService.getForPost.resolves(mockData);

                const result = await service.getPostReferrers('post-123');

                result.should.have.property('data', mockData);
                result.should.have.property('meta', {});
                mockReferrersService.getForPost.calledWith('post-123').should.be.true();
            });
        });

        describe('getReferrersForPost', function () {
            it('delegates to posts service', async function () {
                const expectedResult = {data: [{source: 'twitter', signups: 3}], meta: {}};
                const options = {limit: 10};
                mockPostsService.getReferrersForPost.resolves(expectedResult);

                const result = await service.getReferrersForPost('post-456', options);

                result.should.eql(expectedResult);
                mockPostsService.getReferrersForPost.calledWith('post-456', options).should.be.true();
            });
        });

        describe('getTopContent', function () {
            it('delegates to content service', async function () {
                const expectedResult = {data: [{pathname: '/popular-post', views: 1000}]};
                const options = {date_from: '2023-01-01', date_to: '2023-01-31'};
                mockContentService.getTopContent.resolves(expectedResult);

                const result = await service.getTopContent(options);

                result.should.eql(expectedResult);
                mockContentService.getTopContent.calledWith(options).should.be.true();
            });
        });

        describe('getTopPosts', function () {
            it('delegates to posts service', async function () {
                const expectedResult = {data: [{title: 'Great Post', conversions: 15}]};
                const options = {limit: 5, order: 'conversions'};
                mockPostsService.getTopPosts.resolves(expectedResult);

                const result = await service.getTopPosts(options);

                result.should.eql(expectedResult);
                mockPostsService.getTopPosts.calledWith(options).should.be.true();
            });
        });

        describe('getTopPostsViews', function () {
            it('delegates to posts service', async function () {
                const expectedResult = {data: [{title: 'Viral Post', views: 5000}]};
                const options = {date_from: '2023-01-01', date_to: '2023-01-31', limit: 10};
                mockPostsService.getTopPostsViews.resolves(expectedResult);

                const result = await service.getTopPostsViews(options);

                result.should.eql(expectedResult);
                mockPostsService.getTopPostsViews.calledWith(options).should.be.true();
            });
        });

        describe('getGrowthStatsForPost', function () {
            it('delegates to posts service', async function () {
                const expectedResult = {data: {signups: 12, conversions: 8}, meta: {}};
                mockPostsService.getGrowthStatsForPost.resolves(expectedResult);

                const result = await service.getGrowthStatsForPost('post-789');

                result.should.eql(expectedResult);
                mockPostsService.getGrowthStatsForPost.calledWith('post-789').should.be.true();
            });
        });

        describe('getPostsMemberCounts', function () {
            it('delegates to posts service', async function () {
                const expectedResult = {data: [{'post-1': 10}, {'post-2': 5}]};
                const postIds = ['post-1', 'post-2'];
                mockPostsService.getPostsMemberCounts.resolves(expectedResult);

                const result = await service.getPostsMemberCounts(postIds);

                result.should.eql(expectedResult);
                mockPostsService.getPostsMemberCounts.calledWith(postIds).should.be.true();
            });
        });

        describe('newsletter stats methods', function () {
            describe('getNewsletterStats', function () {
                it('delegates to posts service with newsletter_id', async function () {
                    const expectedResult = {data: [{post_id: 'post-1', opens: 100}]};
                    const options = {newsletter_id: 'newsletter-123', limit: 10};
                    mockPostsService.getNewsletterStats.resolves(expectedResult);

                    const result = await service.getNewsletterStats(options);

                    result.should.eql(expectedResult);
                    mockPostsService.getNewsletterStats.calledWith('newsletter-123', {limit: 10}).should.be.true();
                });

                it('returns empty data when no newsletter_id provided', async function () {
                    const result = await service.getNewsletterStats({});

                    result.should.eql({data: []});
                    mockPostsService.getNewsletterStats.called.should.be.false();
                });
            });

            describe('getNewsletterSubscriberStats', function () {
                it('delegates to posts service with newsletter_id', async function () {
                    const expectedResult = {data: [{total: 500, deltas: []}]};
                    const options = {newsletter_id: 'newsletter-456', date_from: '2023-01-01'};
                    mockPostsService.getNewsletterSubscriberStats.resolves(expectedResult);

                    const result = await service.getNewsletterSubscriberStats(options);

                    result.should.eql(expectedResult);
                    mockPostsService.getNewsletterSubscriberStats.calledWith('newsletter-456', {date_from: '2023-01-01'}).should.be.true();
                });

                it('returns default data when no newsletter_id provided', async function () {
                    const result = await service.getNewsletterSubscriberStats({});

                    result.should.eql({data: [{total: 0, deltas: []}]});
                    mockPostsService.getNewsletterSubscriberStats.called.should.be.false();
                });
            });

            describe('getNewsletterBasicStats', function () {
                it('delegates to posts service with newsletter_id', async function () {
                    const expectedResult = {data: [{post_id: 'post-1', sent_count: 1000}]};
                    const options = {newsletter_id: 'newsletter-789', order: 'sent_count desc'};
                    mockPostsService.getNewsletterBasicStats.resolves(expectedResult);

                    const result = await service.getNewsletterBasicStats(options);

                    result.should.eql(expectedResult);
                    mockPostsService.getNewsletterBasicStats.calledWith('newsletter-789', {order: 'sent_count desc'}).should.be.true();
                });

                it('returns empty data when no newsletter_id provided', async function () {
                    const result = await service.getNewsletterBasicStats({});

                    result.should.eql({data: []});
                    mockPostsService.getNewsletterBasicStats.called.should.be.false();
                });
            });

            describe('getNewsletterClickStats', function () {
                it('delegates to posts service with newsletter_id and post_ids', async function () {
                    const expectedResult = {data: [{post_id: 'post-1', clicks: 50}]};
                    const options = {newsletter_id: 'newsletter-abc', post_ids: 'post-1,post-2'};
                    mockPostsService.getNewsletterClickStats.resolves(expectedResult);

                    const result = await service.getNewsletterClickStats(options);

                    result.should.eql(expectedResult);
                    mockPostsService.getNewsletterClickStats.calledWith('newsletter-abc', 'post-1,post-2').should.be.true();
                });

                it('returns empty data when no newsletter_id provided', async function () {
                    const result = await service.getNewsletterClickStats({post_ids: 'post-1'});

                    result.should.eql({data: []});
                    mockPostsService.getNewsletterClickStats.called.should.be.false();
                });
            });
        });

        describe('getPostStats', function () {
            it('delegates to posts service', async function () {
                const expectedResult = {data: {views: 1000, conversions: 20}};
                mockPostsService.getPostStats.resolves(expectedResult);

                const result = await service.getPostStats('post-xyz');

                result.should.eql(expectedResult);
                mockPostsService.getPostStats.calledWith('post-xyz').should.be.true();
            });
        });

        describe('getPostsVisitorCounts', function () {
            it('delegates to posts service and wraps result', async function () {
                const mockVisitorCounts = {'uuid-1': 100, 'uuid-2': 200};
                mockPostsService.getPostsVisitorCounts.resolves(mockVisitorCounts);

                const postUuids = ['uuid-1', 'uuid-2'];
                const result = await service.getPostsVisitorCounts(postUuids);

                result.should.have.property('data');
                result.data.should.have.property('visitor_counts', mockVisitorCounts);
                mockPostsService.getPostsVisitorCounts.calledWith(postUuids).should.be.true();
            });
        });

        describe('getTopSourcesWithRange', function () {
            it('delegates to referrers service', async function () {
                const expectedResult = {data: [{source: 'google', signups: 25}], meta: {}};
                mockReferrersService.getTopSourcesWithRange.resolves(expectedResult);

                const result = await service.getTopSourcesWithRange('2023-01-01', '2023-01-31', 'signups', 10);

                result.should.eql(expectedResult);
                mockReferrersService.getTopSourcesWithRange.calledWith('2023-01-01', '2023-01-31', 'signups', 10).should.be.true();
            });
        });
    });

    describe('error handling', function () {
        it('propagates errors from underlying services', async function () {
            const testError = new Error('Service error');
            mockMrrService.getHistory.rejects(testError);

            try {
                await service.getMRRHistory();
                should.fail('Expected error to be thrown');
            } catch (error) {
                error.should.equal(testError);
            }
        });
    });
});
