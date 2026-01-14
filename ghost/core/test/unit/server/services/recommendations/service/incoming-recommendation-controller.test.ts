import assert from 'assert/strict';
import {IncomingRecommendationController, IncomingRecommendationService} from '../../../../../../core/server/services/recommendations/service';
import sinon, {SinonSpy} from 'sinon';

describe('IncomingRecommendationController', function () {
    let service: Partial<IncomingRecommendationService>;
    let controller: IncomingRecommendationController;

    beforeEach(function () {
        service = {};
        controller = new IncomingRecommendationController({service: service as IncomingRecommendationService});
    });

    describe('browse', function () {
        beforeEach(function () {
            service.listIncomingRecommendations = async () => {
                return {
                    incomingRecommendations: [
                        {
                            id: '1',
                            title: 'Test 1',
                            url: new URL('https://test1.com'),
                            excerpt: 'Excerpt 1',
                            favicon: new URL('https://test1.com/favicon.ico'),
                            featuredImage: new URL('https://test1.com/image.png'),
                            recommendingBack: true
                        },
                        {
                            id: '2',
                            title: 'Test 2',
                            url: new URL('https://test2.com'),
                            excerpt: 'Excerpt 2',
                            favicon: null,
                            featuredImage: null,
                            recommendingBack: false
                        }
                    ],
                    meta: {
                        pagination: {
                            page: 1,
                            limit: 5,
                            pages: 1,
                            total: 2,
                            next: null,
                            prev: null
                        }
                    }
                };
            };
        });

        it('without options', async function () {
            const result = await controller.browse({
                data: {},
                options: {}
            });

            assert.deepEqual(result, {
                data: [{
                    id: '1',
                    title: 'Test 1',
                    excerpt: 'Excerpt 1',
                    featured_image: 'https://test1.com/image.png',
                    favicon: 'https://test1.com/favicon.ico',
                    url: 'https://test1.com/',
                    recommending_back: true
                },
                {
                    id: '2',
                    title: 'Test 2',
                    excerpt: 'Excerpt 2',
                    featured_image: null,
                    favicon: null,
                    url: 'https://test2.com/',
                    recommending_back: false
                }],
                meta: {
                    pagination: {
                        page: 1,
                        limit: 5,
                        pages: 1,
                        total: 2,
                        next: null,
                        prev: null
                    }
                }
            });
        });

        describe('with options', function () {
            let listSpy: SinonSpy;

            beforeEach(function () {
                listSpy = sinon.spy(service, 'listIncomingRecommendations');
            });

            it('limit is set to 5 by default', async function () {
                await controller.browse({
                    data: {},
                    options: {}
                });
                assert(listSpy.calledOnce);
                const args = listSpy.getCall(0).args[0];
                assert.deepEqual(args.limit, 5);
            });

            it('limit can be set to 100', async function () {
                await controller.browse({
                    data: {},
                    options: {
                        limit: 100
                    }
                });
                assert(listSpy.calledOnce);
                const args = listSpy.getCall(0).args[0];
                assert.deepEqual(args.limit, 100);
            });

            it('limit cannot be set to "all"', async function () {
                await assert.rejects(
                    controller.browse({
                        data: {},
                        options: {
                            limit: 'all'
                        }
                    }),
                    {
                        message: 'limit must be an integer'
                    }
                );
            });

            it('page is set to 1 by default', async function () {
                await controller.browse({
                    data: {},
                    options: {
                    }
                });
                assert(listSpy.calledOnce);
                const args = listSpy.getCall(0).args[0];
                assert.deepEqual(args.page, 1);
            });

            it('page can be set to 2', async function () {
                await controller.browse({
                    data: {},
                    options: {
                        page: 2
                    }
                });
                assert(listSpy.calledOnce);
                const args = listSpy.getCall(0).args[0];
                assert.deepEqual(args.page, 2);
            });
        });
    });
});
