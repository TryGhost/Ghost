const should = require('should');
const sinon = require('sinon');
const testUtils = require('../../../../../../../utils');
const urlService = require('../../../../../../../../frontend/services/url');
const urlUtils = require('../../../../../../../../server/lib/url-utils');
const urlUtil = require('../../../../../../../../server/api/canary/utils/serializers/output/utils/url');

describe('Unit: canary/utils/serializers/output/utils/url', () => {
    beforeEach(() => {
        sinon.stub(urlService, 'getUrlByResourceId').returns('getUrlByResourceId');
        sinon.stub(urlUtils, 'urlFor').returns('urlFor');
        sinon.stub(urlUtils, 'htmlRelativeToAbsolute').returns({html: sinon.stub()});
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('Ensure calls url service', () => {
        let pageModel;

        beforeEach(() => {
            pageModel = (data) => {
                return Object.assign(data, {toJSON: sinon.stub().returns(data)});
            };
        });

        it('meta & models & relations', () => {
            const post = pageModel(testUtils.DataGenerator.forKnex.createPost({
                id: 'id1',
                feature_image: 'value'
            }));

            urlUtil.forPost(post.id, post, {options: {}});

            post.hasOwnProperty('url').should.be.true();

            urlUtils.urlFor.callCount.should.eql(2);
            urlUtils.urlFor.getCall(0).args.should.eql(['image', {image: 'value'}, true]);
            urlUtils.urlFor.getCall(1).args.should.eql(['home', true]);

            urlUtils.htmlRelativeToAbsolute.callCount.should.eql(1);
            urlUtils.htmlRelativeToAbsolute.getCall(0).args.should.eql([
                '## markdown',
                'urlFor',
                'getUrlByResourceId',
                {assetsOnly: true}
            ]);

            urlService.getUrlByResourceId.callCount.should.eql(1);
            urlService.getUrlByResourceId.getCall(0).args.should.eql(['id1', {absolute: true}]);
        });
    });
});
