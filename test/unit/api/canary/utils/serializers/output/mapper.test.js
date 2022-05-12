const should = require('should');
const sinon = require('sinon');
const testUtils = require('../../../../../../utils');
const dateUtil = require('../../../../../../../core/server/api/canary/utils/serializers/output/utils/date');
const urlUtil = require('../../../../../../../core/server/api/canary/utils/serializers/output/utils/url');
const cleanUtil = require('../../../../../../../core/server/api/canary/utils/serializers/output/utils/clean');
const extraAttrsUtils = require('../../../../../../../core/server/api/canary/utils/serializers/output/utils/extra-attrs');
const mappers = require('../../../../../../../core/server/api/canary/utils/serializers/output/mappers');

describe('Unit: utils/serializers/output/mappers', function () {
    afterEach(function () {
        sinon.restore();
    });

    describe('Posts Mapper', function () {
        let postModel;

        beforeEach(function () {
            sinon.stub(dateUtil, 'forPost').returns({});

            sinon.stub(urlUtil, 'forPost').returns({});
            sinon.stub(urlUtil, 'forTag').returns({});
            sinon.stub(urlUtil, 'forUser').returns({});

            sinon.stub(extraAttrsUtils, 'forPost').returns({});

            sinon.stub(cleanUtil, 'post').returns({});
            sinon.stub(cleanUtil, 'tag').returns({});
            sinon.stub(cleanUtil, 'author').returns({});

            postModel = (data) => {
                return Object.assign(data, {
                    toJSON: sinon.stub().returns(data)
                });
            };
        });

        it('calls mapper on relations', function () {
            const frame = {
                original: {
                    context: {}
                },
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

            mappers.posts(post, frame);

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

    describe('User Mapper', function () {
        let userModel;

        beforeEach(function () {
            sinon.stub(urlUtil, 'forUser').returns({});
            sinon.stub(cleanUtil, 'author').returns({});

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

            mappers.users(user, frame);

            urlUtil.forUser.callCount.should.equal(1);
            urlUtil.forUser.getCall(0).args.should.eql(['id1', user, frame.options]);
            cleanUtil.author.callCount.should.equal(1);
        });
    });

    describe('Tag Mapper', function () {
        let tagModel;

        beforeEach(function () {
            sinon.stub(urlUtil, 'forTag').returns({});
            sinon.stub(cleanUtil, 'tag').returns({});

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

            mappers.tags(tag, frame);

            urlUtil.forTag.callCount.should.equal(1);
            urlUtil.forTag.getCall(0).args.should.eql(['id3', tag, frame.options]);
            cleanUtil.tag.callCount.should.equal(1);
        });
    });

    describe('Integration Mapper', function () {
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

            const mapped = mappers.integrations(integration, frame);

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

    describe('Snippet Mapper', function () {
        let snippetModel;

        beforeEach(function () {
            snippetModel = (data) => {
                return Object.assign(data, {toJSON: sinon.stub().returns(data)});
            };
        });

        it('returns only allowed keys', function () {
            const frame = {
            };

            const snippet = snippetModel(testUtils.DataGenerator.forKnex.createBasic({
                name: 'test snippet',
                mobiledoc: testUtils.DataGenerator.markdownToMobiledoc('Hello World'),
                foo: 'bar'
            }));

            const mapped = mappers.snippets(snippet, frame);

            mapped.should.eql({
                id: snippet.id,
                name: snippet.name,
                mobiledoc: snippet.mobiledoc,
                created_at: snippet.created_at,
                updated_at: snippet.updated_at,
                created_by: snippet.created_by,
                updated_by: snippet.updated_by
            });
        });
    });

    describe('Newsletter Mapper', function () {
        let newsletterModel;

        beforeEach(function () {
            newsletterModel = (data) => {
                return Object.assign(data, {toJSON: sinon.stub().returns(data)});
            };
        });

        it('returns only allowed keys for content API', function () {
            const frame = {
                apiType: 'content'
            };

            const newsletter = newsletterModel(testUtils.DataGenerator.forKnex.createNewsletter({
                name: 'Basic newsletter',
                slug: 'basic-newsletter'
            }));

            const mapped = mappers.newsletters(newsletter, frame);

            mapped.should.eql({
                id: newsletter.id,
                uuid: newsletter.uuid,
                name: newsletter.name,
                description: newsletter.description,
                slug: newsletter.slug,
                subscribe_on_signup: newsletter.subscribe_on_signup,
                visibility: newsletter.visibility,
                sort_order: newsletter.sort_order,
                created_at: newsletter.created_at,
                updated_at: newsletter.updated_at
            });
        });

        it('returns all keys for admin API', function () {
            const frame = {};

            const newsletter = newsletterModel(testUtils.DataGenerator.forKnex.createNewsletter({
                name: 'Full newsletter',
                slug: 'full-newsletter'
            }));

            const mapped = mappers.newsletters(newsletter, frame);
            mapped.should.eql(newsletter.toJSON());
        });
    });
});
