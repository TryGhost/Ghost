const should = require('should');
const sinon = require('sinon');
const testUtils = require('../../../../../../../utils');
const urlService = require('../../../../../../../../core/frontend/services/url');
const urlUtils = require('../../../../../../../../core/shared/url-utils');
const urlUtil = require('../../../../../../../../core/server/api/v2/utils/serializers/output/utils/url');

describe('Unit: v2/utils/serializers/output/utils/url', function () {
    beforeEach(function () {
        sinon.stub(urlService, 'getUrlByResourceId').returns('getUrlByResourceId');
        sinon.stub(urlUtils, 'urlFor').returns('urlFor');
        sinon.stub(urlUtils, 'relativeToAbsolute').returns('relativeToAbsolute');
        sinon.stub(urlUtils, 'htmlRelativeToAbsolute').returns({html: sinon.stub()});
        sinon.stub(urlUtils, 'mobiledocRelativeToAbsolute').returns({});
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('Ensure calls url service', function () {
        let pageModel;

        beforeEach(function () {
            pageModel = (data) => {
                return Object.assign(data, {toJSON: sinon.stub().returns(data)});
            };
        });

        it('meta & models & relations', function () {
            const post = pageModel(testUtils.DataGenerator.forKnex.createPost({
                id: 'id1',
                mobiledoc: '{}',
                html: 'html',
                custom_excerpt: 'customExcerpt',
                codeinjection_head: 'codeinjectionHead',
                codeinjection_foot: 'codeinjectionFoot',
                feature_image: 'featureImage',
                posts_meta: {
                    og_image: 'ogImage',
                    twitter_image: 'twitterImage'
                },
                canonical_url: 'canonicalUrl'
            }));

            urlUtil.forPost(post.id, post, {options: {}});

            post.hasOwnProperty('url').should.be.true();

            // feature_image, og_image, twitter_image, canonical_url
            urlUtils.relativeToAbsolute.callCount.should.eql(4);

            // mobiledoc
            urlUtils.mobiledocRelativeToAbsolute.callCount.should.eql(1);

            // html, codeinjection_head, codeinjection_foot
            urlUtils.htmlRelativeToAbsolute.callCount.should.eql(3);
            urlUtils.htmlRelativeToAbsolute.getCall(0).args.should.eql([
                'html',
                'getUrlByResourceId',
                {assetsOnly: true}
            ]);

            urlService.getUrlByResourceId.callCount.should.eql(1);
            urlService.getUrlByResourceId.getCall(0).args.should.eql(['id1', {absolute: true}]);
        });
    });
});
