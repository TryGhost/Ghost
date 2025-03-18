const assert = require('assert/strict');
const sinon = require('sinon');
const gating = require('../../../../../../../../core/server/api/endpoints/utils/serializers/output/utils/post-gating');
const contentGatingService = require('../../../../../../../../core/server/services/content-gating');
const labs = require('../../../../../../../../core/shared/labs');

describe('Unit: endpoints/utils/serializers/output/utils/post-gating', function () {
    afterEach(function () {
        sinon.restore();
    });

    describe('for post', function () {
        let frame;

        beforeEach(function () {
            frame = {
                options: {},
                original: {
                    context: {}
                }
            };
        });

        it('should NOT hide content attributes when visibility is public', function () {
            const attrs = {
                visibility: 'public',
                plaintext: 'no touching',
                html: '<p>I am here to stay</p>'
            };

            gating.forPost(attrs, frame);

            assert.equal(attrs.plaintext, 'no touching');
        });

        it('should hide content attributes when visibility is "members"', function () {
            const attrs = {
                visibility: 'members',
                plaintext: 'no touching. secret stuff',
                html: '<p>I am here to stay</p>'
            };

            gating.forPost(attrs, frame);

            assert.equal(attrs.plaintext, '');
            assert.equal(attrs.html, '');
        });

        it('should NOT hide content attributes when visibility is "members" and member is present', function () {
            const attrs = {
                visibility: 'members',
                plaintext: 'I see dead people',
                html: '<p>What\'s the matter?</p>'
            };

            frame.original.context.member = {};

            gating.forPost(attrs, frame);

            assert.equal(attrs.plaintext, 'I see dead people');
            assert.equal(attrs.html, '<p>What\'s the matter?</p>');
        });

        it('should hide content attributes when visibility is "paid" and member has status of "free"', function () {
            const attrs = {
                visibility: 'paid',
                plaintext: 'I see dead people',
                html: '<p>What\'s the matter?</p>'
            };

            frame.original.context.member = {status: 'free'};

            gating.forPost(attrs, frame);

            assert.equal(attrs.plaintext, '');
            assert.equal(attrs.html, '');
        });

        it('should NOT hide content attributes when visibility is "paid" and member has status of "paid"', function () {
            const attrs = {
                visibility: 'paid',
                plaintext: 'Secret paid content',
                html: '<p>Can read this</p>'
            };

            frame.original.context.member = {status: 'paid'};

            gating.forPost(attrs, frame);

            assert.equal(attrs.plaintext, 'Secret paid content');
            assert.equal(attrs.html, '<p>Can read this</p>');
        });

        describe('contentVisibility', function () {
            let contentVisibilityStub;

            beforeEach(function () {
                contentVisibilityStub = sinon.stub(labs, 'isSet').withArgs('contentVisibility').returns(true);
            });

            afterEach(function () {
                sinon.restore();
            });

            it('does not call removeGatedBlocksFromHtml when a post has no gated blocks', function () {
                const attrs = {
                    visibility: 'public',
                    html: '<p>no gated blocks</p>'
                };

                const removeGatedBlocksFromHtmlStub = sinon.stub(contentGatingService, 'removeGatedBlocksFromHtml');
                gating.forPost(attrs, frame);
                sinon.assert.notCalled(removeGatedBlocksFromHtmlStub);
            });

            it('calls removeGatedBlocksFromHtml when a post has gated blocks', function () {
                const attrs = {
                    visibility: 'public',
                    html: '<!--kg-gated-block:begin nonMember:true--><p>gated block</p><!--kg-gated-block:end-->'
                };

                const removeGatedBlocksFromHtmlStub = sinon.stub(contentGatingService, 'removeGatedBlocksFromHtml');
                gating.forPost(attrs, frame);
                sinon.assert.calledOnce(removeGatedBlocksFromHtmlStub);
            });

            it('updates html, plaintext, and excerpt when a post has gated blocks', function () {
                const attrs = {
                    visibility: 'public',
                    html: `
                    <!--kg-gated-block:begin nonMember:false memberSegment:"status:free,status:-free"--><p>Members only.</p><!--kg-gated-block:end-->
                    <p>Everyone can see this.</p>
                    <!--kg-gated-block:begin nonMember:true--><p>Anonymous only.</p><!--kg-gated-block:end-->
                    `,
                    plaintext: 'Members only. Everyone can see this. Anonymous only.',
                    excerpt: 'Members only. Everyone can see this. Anonymous only.'
                };

                gating.forPost(attrs, frame);

                assert.match(attrs.html, /<p>Everyone can see this\.<\/p>\n\s+<p>Anonymous only.<\/p>/);
                assert.match(attrs.plaintext, /^\n+Everyone can see this.\n+Anonymous only.\n$/);
                assert.match(attrs.excerpt, /^\n+Everyone can see this.\n+Anonymous only.\n$/);
            });

            it('does not process gated blocks with contentVisibility flag disabled', function () {
                contentVisibilityStub.returns(false);

                const regexSpy = sinon.spy(RegExp.prototype, 'test');
                const removeGatedBlocksFromHtmlStub = sinon.stub(contentGatingService, 'removeGatedBlocksFromHtml');

                const attrs = {
                    visibility: 'public',
                    html: '<!--kg-gated-block:begin nonMember:true--><p>gated block</p><!--kg-gated-block:end-->'
                };
                gating.forPost(attrs, frame);

                sinon.assert.notCalled(regexSpy);
                sinon.assert.notCalled(removeGatedBlocksFromHtmlStub);
            });
        });
    });
});
