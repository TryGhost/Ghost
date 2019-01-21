const should = require('should');
const sinon = require('sinon');
const testUtils = require('../../../../../../../utils');
const urlService = require('../../../../../../../../server/services/url');
const urlUtil = require('../../../../../../../../server/api/v2/utils/serializers/output/utils/url');



describe('Unit: v2/utils/serializers/output/utils/url', () => {
    beforeEach(() => {
        sinon.stub(urlService, 'getUrlByResourceId').returns('getUrlByResourceId');
        sinon.stub(urlService.utils, 'urlFor').returns('urlFor');
        sinon.stub(urlService.utils, 'makeAbsoluteUrls').returns({html: sinon.stub()});
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
                feature_image: 'value',
            }));

            urlUtil.forPost(post.id, post, {});

            post.hasOwnProperty('url').should.be.true();

            urlService.utils.urlFor.callCount.should.eql(2);
            urlService.utils.urlFor.getCall(0).args.should.eql(['image', {image: 'value'}, true]);
            urlService.utils.urlFor.getCall(1).args.should.eql(['home', true]);

            urlService.utils.makeAbsoluteUrls.callCount.should.eql(1);
            urlService.utils.makeAbsoluteUrls.getCall(0).args.should.eql([
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
