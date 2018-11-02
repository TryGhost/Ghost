const should = require('should');
const sinon = require('sinon');
const testUtils = require('../../../../../../utils');
const urlService = require('../../../../../../../server/services/url');
const dateUtil = require('../../../../../../../server/api/v2/utils/serializers/output/utils/date');
const serializers = require('../../../../../../../server/api/v2/utils/serializers');

const sandbox = sinon.sandbox.create();

describe('Unit: v2/utils/serializers/output/pages', function () {
    let pageModel;

    beforeEach(function () {
        pageModel = (data) => {
            return Object.assign(data, {toJSON: sandbox.stub().returns(data)});
        };

        sandbox.stub(urlService, 'getUrlByResourceId').returns('getUrlByResourceId');
        sandbox.stub(urlService.utils, 'urlFor').returns('urlFor');
        sandbox.stub(urlService.utils, 'makeAbsoluteUrls').returns({html: sandbox.stub()});
    });

    afterEach(function () {
        sandbox.restore();
    });

    describe('Ensure absolute urls are returned by default', function () {
        it('meta & models & relations', function () {
            const apiConfig = {};
            const frame = {
                options: {
                    withRelated: ['tags', 'authors']
                }
            };

            const ctrlResponse = {
                data: [
                    pageModel(testUtils.DataGenerator.forKnex.createPost({
                        id: 'id1',
                        feature_image: 'value',
                        page: true,
                        tags: [{
                            id: 'id3',
                            feature_image: 'value'
                        }],
                        authors: [{
                            id: 'id4',
                            name: 'Ghosty'
                        }]
                    })),
                    pageModel(testUtils.DataGenerator.forKnex.createPost({
                        id: 'id2',
                        page: true,
                        html: '<img href=/content/test.jpf'
                    }))
                ],
                meta: {}
            };

            serializers.output.pages.all(ctrlResponse, apiConfig, frame);

            frame.response.pages[0].hasOwnProperty('url').should.be.true();
            frame.response.pages[0].tags[0].hasOwnProperty('url').should.be.true();
            frame.response.pages[0].authors[0].hasOwnProperty('url').should.be.true();
            frame.response.pages[1].hasOwnProperty('url').should.be.true();

            urlService.utils.urlFor.callCount.should.eql(4);
            urlService.utils.urlFor.getCall(0).args.should.eql(['image', {image: 'value'}, true]);
            urlService.utils.urlFor.getCall(1).args.should.eql(['home', true]);
            urlService.utils.urlFor.getCall(2).args.should.eql(['image', {image: 'value'}, true]);
            urlService.utils.urlFor.getCall(3).args.should.eql(['home', true]);

            urlService.utils.makeAbsoluteUrls.callCount.should.eql(2);
            urlService.utils.makeAbsoluteUrls.getCall(0).args.should.eql([
                '## markdown',
                'urlFor',
                'getUrlByResourceId',
                {assetsOnly: true}
            ]);

            urlService.utils.makeAbsoluteUrls.getCall(1).args.should.eql([
                '<img href=/content/test.jpf',
                'urlFor',
                'getUrlByResourceId',
                {assetsOnly: true}
            ]);

            urlService.getUrlByResourceId.callCount.should.eql(4);
            urlService.getUrlByResourceId.getCall(0).args.should.eql(['id1', {absolute: true}]);
            urlService.getUrlByResourceId.getCall(1).args.should.eql(['id3', {absolute: true}]);
            urlService.getUrlByResourceId.getCall(2).args.should.eql(['id4', {absolute: true}]);
            urlService.getUrlByResourceId.getCall(3).args.should.eql(['id2', {absolute: true}]);
        });
    });

    describe('Ensure date fields are being processed with date formatter', function () {
        let dateStub;

        beforeEach(() => {
            dateStub = sandbox.stub(dateUtil, 'format');
        });

        it('date formatter is being called for single item in public context', function () {
            const apiConfig = {};
            const frame = {
                options: {
                    context: {
                        public: true
                    }
                }
            };

            const ctrlResponse = pageModel(testUtils.DataGenerator.forKnex.createPost({
                page: true
            }));

            serializers.output.pages.all(ctrlResponse, apiConfig, frame);

            dateStub.callCount.should.equal(3);
        });

        it('date formatter is being called in public context', function () {
            const apiConfig = {};
            const frame = {
                options: {
                    context: {
                        public: true
                    }
                }
            };

            const ctrlResponse = {
                data: [
                    pageModel(testUtils.DataGenerator.forKnex.createPost({
                        page: true
                    })),
                    pageModel(testUtils.DataGenerator.forKnex.createPost({
                        page: true
                    }))
                ],
                meta: {}
            };

            serializers.output.pages.all(ctrlResponse, apiConfig, frame);

            dateStub.callCount.should.equal(6);
        });

        it('date formatter is not being called in private context', function () {
            const apiConfig = {};
            const frame = {
                options: {
                    context: {
                        public: false
                    }
                }
            };

            const ctrlResponse = {
                data: [
                    pageModel(testUtils.DataGenerator.forKnex.createPost({
                        page: true
                    }))
                ],
                meta: {}
            };

            serializers.output.pages.all(ctrlResponse, apiConfig, frame);

            dateStub.called.should.be.false;
        });
    });
});
