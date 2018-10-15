const should = require('should');
const sinon = require('sinon');
const testUtils = require('../../../../../../utils');
const urlService = require('../../../../../../../server/services/url');
const serializers = require('../../../../../../../server/api/v2/utils/serializers');
const sandbox = sinon.sandbox.create();

describe('Unit: v2/utils/serializers/output/posts', function () {
    let postModel;

    beforeEach(function () {
        postModel = (data) => {
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
                    postModel(testUtils.DataGenerator.forKnex.createPost({
                        id: 'id1',
                        feature_image: 'value',
                        tags: [{
                            id: 'id3',
                            feature_image: 'value'
                        }],
                        authors: [{
                            id: 'id4',
                            name: 'Ghosty'
                        }]
                    })),
                    postModel(testUtils.DataGenerator.forKnex.createPost({
                        id: 'id2',
                        html: '<img href=/content/test.jpf'

                    }))
                ],
                meta: {}
            };

            serializers.output.posts.all(ctrlResponse, apiConfig, frame);

            frame.response.posts[0].hasOwnProperty('url').should.be.true();
            frame.response.posts[0].tags[0].hasOwnProperty('url').should.be.true();
            frame.response.posts[0].authors[0].hasOwnProperty('url').should.be.true();
            frame.response.posts[1].hasOwnProperty('url').should.be.true();

            urlService.utils.urlFor.callCount.should.eql(4);
            urlService.utils.urlFor.getCall(0).args.should.eql(['image', {image: 'value'}, true]);
            urlService.utils.urlFor.getCall(1).args.should.eql(['home', true]);
            urlService.utils.urlFor.getCall(2).args.should.eql(['image', {image: 'value'}, true]);
            urlService.utils.urlFor.getCall(3).args.should.eql(['home', true]);

            urlService.utils.makeAbsoluteUrls.callCount.should.eql(2);
            urlService.utils.makeAbsoluteUrls.getCall(0).args.should.eql(['## markdown', 'urlFor', 'getUrlByResourceId']);
            urlService.utils.makeAbsoluteUrls.getCall(1).args.should.eql(['<img href=/content/test.jpf', 'urlFor', 'getUrlByResourceId']);

            urlService.getUrlByResourceId.callCount.should.eql(4);
            urlService.getUrlByResourceId.getCall(0).args.should.eql(['id1', {absolute: true}]);
            urlService.getUrlByResourceId.getCall(1).args.should.eql(['id3', {absolute: true}]);
            urlService.getUrlByResourceId.getCall(2).args.should.eql(['id4', {absolute: true}]);
            urlService.getUrlByResourceId.getCall(3).args.should.eql(['id2', {absolute: true}]);
        });
    });
});
