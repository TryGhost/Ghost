const should = require('should');
const sinon = require('sinon');
const testUtils = require('../../../../../../../utils');
const dateUtil = require('../../../../../../../../server/api/v2/utils/serializers/output/utils/date');
const urlUtil = require('../../../../../../../../server/api/v2/utils/serializers/output/utils/url');
const cleanUtil = require('../../../../../../../../server/api/v2/utils/serializers/output/utils/clean');
const extraAttrsUtils = require('../../../../../../../../server/api/v2/utils/serializers/output/utils/extra-attrs');
const mapper = require('../../../../../../../../server/api/v2/utils/serializers/output/utils/mapper');

const sandbox = sinon.sandbox.create();

describe('Unit: v2/utils/serializers/output/utils/mapper', () => {
    beforeEach(() => {
        sandbox.stub(dateUtil, 'forPost').returns({});

        sandbox.stub(urlUtil, 'forPost').returns({});
        sandbox.stub(urlUtil, 'forTag').returns({});
        sandbox.stub(urlUtil, 'forUser').returns({});

        sandbox.stub(extraAttrsUtils, 'forPost').returns({});

        sandbox.stub(cleanUtil, 'post').returns({});
        sandbox.stub(cleanUtil, 'tag').returns({});
        sandbox.stub(cleanUtil, 'author').returns({});
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe('mapPost', () => {
        let postModel;

        beforeEach(() => {
            postModel = (data) => {
                return Object.assign(data, {
                    toJSON: sandbox.stub().returns(data)
                });
            };
        });

        it('calls mapper on relations', () => {
            const frame = {
                options: {
                    withRelated: ['tags', 'authors'],
                    context: {
                        public: true
                    }
                }
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

            urlUtil.forTag.getCall(0).args.should.eql(['id3', {id: 'id3', feature_image: 'value'}]);
            urlUtil.forUser.getCall(0).args.should.eql(['id4', {name: 'Ghosty', id: 'id4'}]);
        });

        it('does not call cleanUtil in private context', () => {
            const frame = {
                withRelated: ['tags', 'authors'],
                options: {
                    context: {
                        public: false
                    }
                },
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

            cleanUtil.post.callCount.should.equal(0);
            cleanUtil.tag.callCount.should.equal(0);
            cleanUtil.author.callCount.should.equal(0);
        });
    });

    describe('mapUser', () => {
        let userModel;

        beforeEach(() => {
            userModel = (data) => {
                return Object.assign(data, {toJSON: sandbox.stub().returns(data)});
            };
        });

        it('calls utils', () => {
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
            urlUtil.forUser.getCall(0).args.should.eql(['id1', user]);
        });
    });

    describe('mapTag', () => {
        let tagModel;

        beforeEach(() => {
            tagModel = (data) => {
                return Object.assign(data, {toJSON: sandbox.stub().returns(data)});
            };
        });

        it('calls utils', () => {
            const frame = {
                options: {
                    context: {
                        public: true
                    }
                },
            };

            const tag = tagModel(testUtils.DataGenerator.forKnex.createTag({
                id: 'id3',
                feature_image: 'value'
            }));

            mapper.mapTag(tag, frame);

            urlUtil.forTag.callCount.should.equal(1);
            urlUtil.forTag.getCall(0).args.should.eql(['id3', tag]);
        });
    });
});
