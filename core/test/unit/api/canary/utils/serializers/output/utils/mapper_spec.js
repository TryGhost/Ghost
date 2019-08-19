const should = require('should');
const sinon = require('sinon');
const testUtils = require('../../../../../../../utils');
const dateUtil = require('../../../../../../../../server/api/canary/utils/serializers/output/utils/date');
const urlUtil = require('../../../../../../../../server/api/canary/utils/serializers/output/utils/url');
const cleanUtil = require('../../../../../../../../server/api/canary/utils/serializers/output/utils/clean');
const extraAttrsUtils = require('../../../../../../../../server/api/canary/utils/serializers/output/utils/extra-attrs');
const mapper = require('../../../../../../../../server/api/canary/utils/serializers/output/utils/mapper');

describe('Unit: canary/utils/serializers/output/utils/mapper', function () {
    beforeEach(function () {
        sinon.stub(dateUtil, 'forPost').returns({});

        sinon.stub(urlUtil, 'forPost').returns({});
        sinon.stub(urlUtil, 'forTag').returns({});
        sinon.stub(urlUtil, 'forUser').returns({});

        sinon.stub(extraAttrsUtils, 'forPost').returns({});

        sinon.stub(cleanUtil, 'post').returns({});
        sinon.stub(cleanUtil, 'tag').returns({});
        sinon.stub(cleanUtil, 'author').returns({});
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('mapPost', function () {
        let postModel;

        beforeEach(function () {
            postModel = (data) => {
                return Object.assign(data, {
                    toJSON: sinon.stub().returns(data)
                });
            };
        });

        it('calls mapper on relations', function () {
            const frame = {
                options: {
                    withRelated: ['tags', 'authors'],
                    context: {}
                },
                apiType: 'content'
            };

            const post = postModel(testUtils.DataGenerator.forKnex.createPost({
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
            }));

            mapper.mapPost(post, frame);

            dateUtil.forPost.callCount.should.equal(1);

            extraAttrsUtils.forPost.callCount.should.equal(1);

            cleanUtil.post.callCount.should.eql(1);
            cleanUtil.tag.callCount.should.eql(1);
            cleanUtil.author.callCount.should.eql(1);

            urlUtil.forPost.callCount.should.equal(1);
            urlUtil.forTag.callCount.should.equal(1);
            urlUtil.forUser.callCount.should.equal(1);

            urlUtil.forTag.getCall(0).args.should.eql(['id3', {id: 'id3', feature_image: 'value'}, frame.options]);
            urlUtil.forUser.getCall(0).args.should.eql(['id4', {name: 'Ghosty', id: 'id4'}, frame.options]);
        });
    });

    describe('mapUser', function () {
        let userModel;

        beforeEach(function () {
            userModel = (data) => {
                return Object.assign(data, {toJSON: sinon.stub().returns(data)});
            };
        });

        it('calls utils', function () {
            const frame = {
                options: {
                    context: {}
                }
            };

            const user = userModel(testUtils.DataGenerator.forKnex.createUser({
                id: 'id1',
                name: 'Ghosty'
            }));

            mapper.mapUser(user, frame);

            urlUtil.forUser.callCount.should.equal(1);
            urlUtil.forUser.getCall(0).args.should.eql(['id1', user, frame.options]);
        });
    });

    describe('mapTag', function () {
        let tagModel;

        beforeEach(function () {
            tagModel = (data) => {
                return Object.assign(data, {toJSON: sinon.stub().returns(data)});
            };
        });

        it('calls utils', function () {
            const frame = {
                options: {
                    context: {}
                }
            };

            const tag = tagModel(testUtils.DataGenerator.forKnex.createTag({
                id: 'id3',
                feature_image: 'value'
            }));

            mapper.mapTag(tag, frame);

            urlUtil.forTag.callCount.should.equal(1);
            urlUtil.forTag.getCall(0).args.should.eql(['id3', tag, frame.options]);
        });
    });

    describe('mapIntegration', function () {
        let integrationModel;

        beforeEach(function () {
            integrationModel = (data) => {
                return Object.assign(data, {toJSON: sinon.stub().returns(data)});
            };
        });

        it('formats admin keys', function () {
            const frame = {
            };

            const integration = integrationModel(testUtils.DataGenerator.forKnex.createIntegration({
                api_keys: testUtils.DataGenerator.Content.api_keys
            }));

            const mapped = mapper.mapIntegration(integration, frame);

            should.exist(mapped.api_keys);

            mapped.api_keys.forEach((key) => {
                if (key.type === 'admin') {
                    const [id, secret] = key.secret.split(':');
                    should.exist(id);
                    should.exist(secret);
                } else {
                    const [id, secret] = key.secret.split(':');
                    should.exist(id);
                    should.not.exist(secret);
                }
            });
        });
    });
});
