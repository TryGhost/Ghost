const should = require('should');
const sinon = require('sinon');
const testUtils = require('../../../../../../utils');
const dateUtil = require('../../../../../../../core/server/api/endpoints/utils/serializers/output/utils/date');
const urlUtil = require('../../../../../../../core/server/api/endpoints/utils/serializers/output/utils/url');
const cleanUtil = require('../../../../../../../core/server/api/endpoints/utils/serializers/output/utils/clean');
const extraAttrsUtils = require('../../../../../../../core/server/api/endpoints/utils/serializers/output/utils/extra-attrs');
const mappers = require('../../../../../../../core/server/api/endpoints/utils/serializers/output/mappers');
const memberAttribution = require('../../../../../../../core/server/services/member-attribution');
const htmlToPlaintext = require('@tryghost/html-to-plaintext');

function createJsonModel(data) {
    return Object.assign(data, {toJSON: sinon.stub().returns(data)});
}

describe('Unit: utils/serializers/output/mappers', function () {
    afterEach(function () {
        sinon.restore();
    });

    describe('Posts Mapper', function () {
        beforeEach(function () {
            sinon.stub(dateUtil, 'forPost').returns({});

            sinon.stub(urlUtil, 'forPost').returns({});
            sinon.stub(urlUtil, 'forTag').returns({});
            sinon.stub(urlUtil, 'forUser').returns({});

            sinon.stub(extraAttrsUtils, 'forPost').returns({});

            sinon.stub(cleanUtil, 'post').returns({});
            sinon.stub(cleanUtil, 'tag').returns({});
            sinon.stub(cleanUtil, 'author').returns({});

            memberAttribution.outboundLinkTagger = {
                addToHtml: sinon.stub().callsFake(html => Promise.resolve(html))
            };
        });

        it('calls mapper on relations', async function () {
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

            const post = createJsonModel(testUtils.DataGenerator.forKnex.createPost({
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

            await mappers.posts(post, frame);

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
        beforeEach(function () {
            sinon.stub(urlUtil, 'forUser').returns({});
            sinon.stub(cleanUtil, 'author').returns({});
        });

        it('calls utils', function () {
            const frame = {
                options: {
                    context: {}
                }
            };

            const user = createJsonModel(testUtils.DataGenerator.forKnex.createUser({
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
        beforeEach(function () {
            sinon.stub(urlUtil, 'forTag').returns({});
            sinon.stub(cleanUtil, 'tag').returns({});
        });

        it('calls utils', function () {
            const frame = {
                options: {
                    context: {}
                }
            };

            const tag = createJsonModel(testUtils.DataGenerator.forKnex.createTag({
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
        it('formats admin keys', function () {
            const frame = {
            };

            const integration = createJsonModel(testUtils.DataGenerator.forKnex.createIntegration({
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
        it('returns only allowed keys', function () {
            const frame = {
            };

            const snippet = createJsonModel(testUtils.DataGenerator.forKnex.createBasic({
                name: 'test snippet',
                mobiledoc: testUtils.DataGenerator.markdownToMobiledoc('Hello World'),
                foo: 'bar'
            }));

            const mapped = mappers.snippets(snippet, frame);

            mapped.should.eql({
                id: snippet.id,
                name: snippet.name,
                mobiledoc: snippet.mobiledoc,
                lexical: snippet.lexical,
                created_at: snippet.created_at,
                updated_at: snippet.updated_at,
                created_by: snippet.created_by,
                updated_by: snippet.updated_by
            });
        });
    });

    describe('Newsletter Mapper', function () {
        it('returns only allowed keys for content API', function () {
            const frame = {
                apiType: 'content'
            };

            const newsletter = createJsonModel(testUtils.DataGenerator.forKnex.createNewsletter({
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
                sender_email: newsletter.sender_email,
                subscribe_on_signup: newsletter.subscribe_on_signup,
                visibility: newsletter.visibility,
                sort_order: newsletter.sort_order,
                created_at: newsletter.created_at,
                updated_at: newsletter.updated_at
            });
        });

        it('returns all keys for admin API', function () {
            const frame = {};

            const newsletter = createJsonModel(testUtils.DataGenerator.forKnex.createNewsletter({
                name: 'Full newsletter',
                slug: 'full-newsletter',
                sender_email: null,
                sender_reply_to: 'newsletter'
            }));

            const mapped = mappers.newsletters(newsletter, frame);
            mapped.should.eql(newsletter.toJSON());
        });
    });

    describe('Email Batch Mapper', function () {
        it('returns only mapped keys', function () {
            const frame = {};

            const model = createJsonModel({
                id: 'id1',
                provider_id: 'provider_id1',
                status: 'status1',
                member_segment: 'member_segment1',
                created_at: 'created_at1',
                updated_at: 'updated_at1',
                error_status_code: 'error_status_code1',
                error_message: 'error_message1',
                error_data: 'error_data1',
                foo: 'bar',
                count: {
                    recipients: 12,
                    foo: 1
                }
            });

            const mapped = mappers.emailBatches(model, frame);
            mapped.should.eql({
                id: 'id1',
                provider_id: 'provider_id1',
                status: 'status1',
                member_segment: 'member_segment1',
                created_at: 'created_at1',
                updated_at: 'updated_at1',
                error_status_code: 'error_status_code1',
                error_message: 'error_message1',
                error_data: 'error_data1',
                count: {
                    recipients: 12
                }
            });
        });
    });

    describe('Email Failure Mapper', function () {
        it('returns only mapped keys', function () {
            const frame = {};

            const model = createJsonModel({
                id: 'id1',
                code: 'code1',
                enhanced_code: 'enhanced_code1',
                message: 'message1',
                severity: 'severity1',
                failed_at: 'failed_at1',
                event_id: 'event_id1',
                foo: 'bar',
                member: {
                    id: 'id1',
                    uuid: 'uuid1',
                    name: 'name1',
                    email: 'email1',
                    avatar_image: 'avatar_image1',
                    foo: 'bar'
                },
                emailRecipient: {
                    id: 'id1',
                    batch_id: 'batch_id1',
                    processed_at: 'processed_at1',
                    delivered_at: 'delivered_at1',
                    opened_at: 'opened_at1',
                    failed_at: 'failed_at1',
                    member_uuid: 'member_uuid1',
                    member_email: 'member_email1',
                    member_name: 'member_name1',
                    foo: 'bar'
                }
            });

            const mapped = mappers.emailFailures(model, frame);
            mapped.should.eql({
                id: 'id1',
                code: 'code1',
                enhanced_code: 'enhanced_code1',
                message: 'message1',
                severity: 'severity1',
                failed_at: 'failed_at1',
                event_id: 'event_id1',
                member: {
                    id: 'id1',
                    uuid: 'uuid1',
                    name: 'name1',
                    email: 'email1',
                    avatar_image: 'avatar_image1'
                },
                email_recipient: {
                    id: 'id1',
                    batch_id: 'batch_id1',
                    processed_at: 'processed_at1',
                    delivered_at: 'delivered_at1',
                    opened_at: 'opened_at1',
                    failed_at: 'failed_at1',
                    member_uuid: 'member_uuid1',
                    member_email: 'member_email1',
                    member_name: 'member_name1'
                }
            });
        });

        it('returns null for missing relations', function () {
            const frame = {};

            const model = createJsonModel({
                id: 'id1',
                code: 'code1',
                enhanced_code: 'enhanced_code1',
                message: 'message1',
                severity: 'severity1',
                failed_at: 'failed_at1',
                event_id: 'event_id1',
                foo: 'bar'
            });

            const mapped = mappers.emailFailures(model, frame);
            mapped.should.eql({
                id: 'id1',
                code: 'code1',
                enhanced_code: 'enhanced_code1',
                message: 'message1',
                severity: 'severity1',
                failed_at: 'failed_at1',
                event_id: 'event_id1',
                member: null,
                email_recipient: null
            });
        });
    });

    describe('Activity Feed Mapper', function () {
        beforeEach(function () {
            sinon.stub(urlUtil, 'forPost').callsFake((_, a) => {
                a.url = 'https://generatedurl';
            });
        });

        it('maps comment_event', function () {
            const frame = {};

            const model = {
                foo: 'bar',
                type: 'comment_event',
                data: {
                    id: 'id1',
                    status: 'status1',
                    html: 'html1',
                    created_at: 'created_at1',
                    edited_at: 'edited_at1',
                    foo: 'bar',
                    member: {
                        id: 'id1',
                        uuid: 'uuid1',
                        name: 'name1',
                        expertise: 'expertise1',
                        avatar_image: 'avatar_image1',
                        foo: 'bar'
                    },
                    post: {
                        id: 'id1',
                        uuid: 'uuid1',
                        title: 'title1',
                        url: 'url1',
                        foo: 'bar'
                    },
                    count: {
                        replies: 12,
                        likes: 13,
                        foo: 1
                    }
                }
            };

            const mapped = mappers.activityFeedEvents(model, frame);
            mapped.should.eql({
                foo: 'bar',
                type: 'comment_event',
                data: {
                    // same except the remove foo keys
                    id: 'id1',
                    in_reply_to_id: null,
                    in_reply_to_snippet: null,
                    status: 'status1',
                    html: 'html1',
                    created_at: 'created_at1',
                    edited_at: 'edited_at1',
                    member: {
                        id: 'id1',
                        uuid: 'uuid1',
                        name: 'name1',
                        expertise: 'expertise1',
                        avatar_image: 'avatar_image1'
                    },
                    post: {
                        id: 'id1',
                        uuid: 'uuid1',
                        title: 'title1',
                        url: 'https://generatedurl'
                    },
                    count: {
                        replies: 12,
                        likes: 13
                    }
                }
            });
        });

        it('maps click_event', function () {
            const frame = {};

            const model = {
                foo: 'bar',
                type: 'click_event',
                data: {
                    id: 'id1',
                    created_at: 'created_at1',
                    foo: 'bar',
                    link: {
                        from: 'from',
                        to: 'to',
                        foo: 'bar',
                        post: {
                            id: 'id1',
                            uuid: 'uuid1',
                            title: 'title1',
                            url: 'url1',
                            foo: 'bar'
                        }
                    },
                    member: {
                        id: 'id1',
                        uuid: 'uuid1',
                        name: 'name1',
                        avatar_image: 'avatar_image1',
                        foo: 'bar'
                    }
                }
            };

            const mapped = mappers.activityFeedEvents(model, frame);
            mapped.should.eql({
                foo: 'bar',
                type: 'click_event',
                data: {
                    // same except the remove foo keys
                    id: 'id1',
                    created_at: 'created_at1',
                    link: {
                        from: 'from',
                        to: 'to'
                    },
                    post: {
                        id: 'id1',
                        uuid: 'uuid1',
                        title: 'title1',
                        url: 'https://generatedurl'
                    },
                    member: {
                        id: 'id1',
                        uuid: 'uuid1',
                        name: 'name1',
                        avatar_image: 'avatar_image1'
                    }
                }
            });
        });

        it('maps aggregated_click_event', function () {
            const frame = {};

            const model = {
                foo: 'bar',
                type: 'aggregated_click_event',
                data: {
                    id: 'id1',
                    created_at: 'created_at1',
                    foo: 'bar',
                    member: {
                        id: 'id1',
                        uuid: 'uuid1',
                        name: 'name1',
                        avatar_image: 'avatar_image1',
                        foo: 'bar'
                    },
                    count: {
                        clicks: 12,
                        foo: 1
                    }
                }
            };

            const mapped = mappers.activityFeedEvents(model, frame);
            mapped.should.eql({
                foo: 'bar',
                type: 'aggregated_click_event',
                data: {
                    // same except the remove foo keys
                    id: 'id1',
                    created_at: 'created_at1',
                    member: {
                        id: 'id1',
                        uuid: 'uuid1',
                        name: 'name1',
                        avatar_image: 'avatar_image1'
                    },
                    count: {
                        clicks: 12
                    }
                }
            });
        });

        it('maps feedback_event', function () {
            const frame = {};

            const model = {
                foo: 'bar',
                type: 'feedback_event',
                data: {
                    id: 'id1',
                    score: 5,
                    created_at: 'created_at1',
                    foo: 'bar',
                    member: {
                        id: 'id1',
                        uuid: 'uuid1',
                        name: 'name1',
                        avatar_image: 'avatar_image1',
                        foo: 'bar'
                    },
                    post: {
                        id: 'id1',
                        uuid: 'uuid1',
                        title: 'title1',
                        url: 'url1',
                        foo: 'bar'
                    }
                }
            };

            const mapped = mappers.activityFeedEvents(model, frame);
            mapped.should.eql({
                foo: 'bar',
                type: 'feedback_event',
                data: {
                    // same except the remove foo keys
                    id: 'id1',
                    score: 5,
                    created_at: 'created_at1',
                    member: {
                        id: 'id1',
                        uuid: 'uuid1',
                        name: 'name1',
                        avatar_image: 'avatar_image1'
                    },
                    post: {
                        id: 'id1',
                        uuid: 'uuid1',
                        title: 'title1',
                        url: 'https://generatedurl'
                    }
                }
            });

            const mapped2 = mappers.activityFeedEvents({...model, data: {...model.data, member: undefined, post: undefined}}, frame);
            mapped2.should.eql({
                foo: 'bar',
                type: 'feedback_event',
                data: {
                    // same except the remove foo keys
                    id: 'id1',
                    score: 5,
                    created_at: 'created_at1',
                    member: null,
                    post: null
                }
            });
        });
    });

    describe('Comment mapper', function () {
        it('includes in_reply_to_snippet for published replies-to-replies', function () {
            const frame = {};

            const model = {
                id: 'comment3',
                html: '<p>comment 3</p>',
                member: {id: 'member1'},
                parent: {
                    id: 'comment1',
                    html: '<p>comment 1</p>',
                    member: {id: 'member1'}
                },
                in_reply_to_id: 'comment2',
                inReplyTo: {
                    id: 'comment2',
                    parent_id: 'comment1',
                    html: '<p>comment 2</p>',
                    status: 'published',
                    member: {id: 'member2'}
                }
            };

            const mapped = mappers.comments(model, frame);

            mapped.should.eql({
                id: 'comment3',
                html: '<p>comment 3</p>',
                member: {id: 'member1'},
                parent: {
                    id: 'comment1',
                    html: '<p>comment 1</p>',
                    member: {id: 'member1'},
                    in_reply_to_id: null,
                    in_reply_to_snippet: null
                },
                in_reply_to_id: 'comment2',
                in_reply_to_snippet: 'comment 2'
            });
        });

        it('calls correct html-to-plaintext converter for in_reply_to_snippet', function () {
            const converterSpy = sinon.spy(htmlToPlaintext, 'commentSnippet');

            const frame = {};

            const model = {
                inReplyTo: {
                    html: '<p>First paragraph <a href="https://example.com">with link</a>,<br> and new line.</p><p>Second paragraph</p>',
                    status: 'published'
                }
            };

            const mapped = mappers.comments(model, frame);

            converterSpy.calledOnce.should.eql(true, 'htmlToPlaintext.commentSnippet was not called');

            mapped.should.eql({
                in_reply_to_snippet: 'First paragraph with link, and new line. Second paragraph',
                member: null
            });
        });

        it('includes null in_reply_to attributes for top-level comments', function () {
            const frame = {};

            const model = {
                id: 'comment1',
                html: '<p>comment 1</p>',
                inReplyTo: undefined
            };

            const mapped = mappers.comments(model, frame);

            mapped.should.eql({
                id: 'comment1',
                html: '<p>comment 1</p>',
                member: null,
                in_reply_to_id: null,
                in_reply_to_snippet: null
            });
        });
    });
});
