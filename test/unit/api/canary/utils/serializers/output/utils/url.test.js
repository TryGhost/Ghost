const should = require('should');
const sinon = require('sinon');
const testUtils = require('../../../../../../../utils');
const urlService = require('../../../../../../../../core/server/services/url');
const urlUtils = require('../../../../../../../../core/shared/url-utils');
const urlUtil = require('../../../../../../../../core/server/api/canary/utils/serializers/output/utils/url');

describe('Unit: canary/utils/serializers/output/utils/url', function () {
    beforeEach(function () {
        sinon.stub(urlService, 'getUrlByResourceId').returns('getUrlByResourceId');
        sinon.stub(urlUtils, 'urlFor').returns('urlFor');
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

            urlService.getUrlByResourceId.callCount.should.eql(1);
            urlService.getUrlByResourceId.getCall(0).args.should.eql(['id1', {absolute: true}]);
        });
    });
});
