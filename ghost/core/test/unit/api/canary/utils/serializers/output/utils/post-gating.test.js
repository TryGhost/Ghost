const assert = require('assert/strict');
const sinon = require('sinon');
const htmlToPlaintext = require('@tryghost/html-to-plaintext');
const gating = require('../../../../../../../../core/server/api/endpoints/utils/serializers/output/utils/post-gating');
const membersContentGating = require('../../../../../../../../core/server/services/members/content-gating');
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

            it('does not call stripGatedBlocks when a post has no gated blocks', function () {
                const attrs = {
                    visibility: 'public',
                    html: '<p>no gated blocks</p>'
                };

                const stripGatedBlocksStub = sinon.stub(gating, 'stripGatedBlocks');
                gating.forPost(attrs, frame);
                sinon.assert.notCalled(stripGatedBlocksStub);
            });

            it('calls stripGatedBlocks when a post has gated blocks', function () {
                const attrs = {
                    visibility: 'public',
                    html: '<!--kg-gated-block:begin nonMember:true--><p>gated block</p><!--kg-gated-block:end-->'
                };

                const stripGatedBlocksStub = sinon.stub(gating, 'stripGatedBlocks');
                gating.forPost(attrs, frame);
                sinon.assert.calledOnce(stripGatedBlocksStub);
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
                const stripGatedBlocksStub = sinon.stub(gating, 'stripGatedBlocks');

                const attrs = {
                    visibility: 'public',
                    html: '<!--kg-gated-block:begin nonMember:true--><p>gated block</p><!--kg-gated-block:end-->'
                };
                gating.forPost(attrs, frame);

                sinon.assert.notCalled(regexSpy);
                sinon.assert.notCalled(stripGatedBlocksStub);
            });

            it('does not call htmlToPlaintext.excerpt more than once', function () {
                const excerptStub = sinon.stub(htmlToPlaintext, 'excerpt').returns('excerpt');

                const attrs = {
                    visibility: 'public',
                    html: '<!--kg-gated-block:begin nonMember:true--><p>gated block</p><!--kg-gated-block:end-->',
                    excerpt: 'gated block'
                };

                gating.forPost(attrs, frame);
                sinon.assert.calledOnce(excerptStub);
            });
        });
    });

    describe('parseGatedBlockParams', function () {
        function testFn(input, expected) {
            const params = gating.parseGatedBlockParams(input);
            assert.deepEqual(params, expected);
        }

        const validTestCases = [{
            input: 'nonMember:true',
            output: {nonMember: true}
        }, {
            input: 'nonMember:false',
            output: {nonMember: false}
        }, {
            input: 'nonMember:\'true\'',
            output: {nonMember: true}
        }, {
            input: 'nonMember:\'false\'',
            output: {nonMember: false}
        }, {
            input: 'nonMember:"true"',
            output: {nonMember: true}
        }, {
            input: 'memberSegment:\'\'',
            output: {}
        }, {
            input: 'memberSegment:"status:free"',
            output: {memberSegment: 'status:free'}
        }, {
            input: 'nonMember:true memberSegment:"status:free"',
            output: {nonMember: true, memberSegment: 'status:free'}
        }, {
            input: 'memberSegment:"status:free" nonMember:true',
            output: {nonMember: true, memberSegment: 'status:free'}
        }];

        validTestCases.forEach(function (testCase) {
            it(`should parse ${testCase.input} correctly`, function () {
                testFn(testCase.input, testCase.output);
            });
        });

        // we only support known keys and values with the correct types and allowed values
        // we should also handle malformed input gracefully
        const invalidTestCases = [{
            input: 'unknownKey:true nonMember:false',
            output: {nonMember: false}
        }, {
            input: 'nonMember:invalid',
            output: {}
        }, {
            input: 'nonMember: memberSegment:"status:free"',
            output: {memberSegment: 'status:free'}
        }, {
            input: 'memberSegment:"status:paid"',
            output: {}
        }, {
            input: 'nonMember:memberSegment:"status:free"',
            output: {}
        }, {
            input: 'memberSegment',
            output: {}
        }];

        invalidTestCases.forEach(function (testCase) {
            it(`should handle unexpected input ${testCase.input} correctly`, function () {
                testFn(testCase.input, testCase.output);
            });
        });
    });

    describe('stripGatedBlocks', function () {
        function stubCheckGatedBlockAccess(permitAccess) {
            return sinon.stub(membersContentGating, 'checkGatedBlockAccess').returns(permitAccess);
        }

        it('handles content with no gated blocks', function () {
            const checkGatedBlockAccessStub = stubCheckGatedBlockAccess(true);
            const html = '<p>no gated blocks</p>';
            const result = gating.stripGatedBlocks(html, {});
            assert.equal(result, html);
            sinon.assert.notCalled(checkGatedBlockAccessStub);
        });

        it('handles content with only a denied gated block', function () {
            const checkGatedBlockAccessStub = stubCheckGatedBlockAccess(false);
            const html = '<!--kg-gated-block:begin nonMember:false--><p>gated blocks</p><!--kg-gated-block:end-->';
            const result = gating.stripGatedBlocks(html, {});
            sinon.assert.calledWith(checkGatedBlockAccessStub, {nonMember: false}, {});
            assert.equal(result, '');
        });

        it('handles content with only a permitted gated block', function () {
            const checkGatedBlockAccessStub = stubCheckGatedBlockAccess(true);
            const html = '<!--kg-gated-block:begin nonMember:true--><p>gated blocks</p><!--kg-gated-block:end-->';
            const result = gating.stripGatedBlocks(html, {});
            sinon.assert.calledWith(checkGatedBlockAccessStub, {nonMember: true}, {});
            assert.equal(result, '<p>gated blocks</p>');
        });

        it('handles content with multiple permitted blocks', function () {
            const checkGatedBlockAccessStub = stubCheckGatedBlockAccess(true);
            const html = `
                <!--kg-gated-block:begin nonMember:true--><p>gated block 1</p><!--kg-gated-block:end-->
                <p>Non-gated block</p>
                <!--kg-gated-block:begin nonMember:true--><p>gated block 2</p><!--kg-gated-block:end-->
            `;
            const result = gating.stripGatedBlocks(html, {});
            sinon.assert.calledTwice(checkGatedBlockAccessStub);
            assert.equal(result, `
                <p>gated block 1</p>
                <p>Non-gated block</p>
                <p>gated block 2</p>
            `);
        });

        it('handles mix of permitted and denied blocks', function () {
            const checkGatedBlockAccessStub = sinon.stub(membersContentGating, 'checkGatedBlockAccess')
                .onFirstCall().returns(false)
                .onSecondCall().returns(true);
            const html = `
                <!--kg-gated-block:begin nonMember:true--><p>gated block 1</p><!--kg-gated-block:end-->
                <p>Non-gated block</p>
                <!--kg-gated-block:begin nonMember:false--><p>gated block 2</p><!--kg-gated-block:end-->
            `;
            const result = gating.stripGatedBlocks(html, null);
            sinon.assert.calledTwice(checkGatedBlockAccessStub);
            assert.equal(result.trim(), `
                <p>Non-gated block</p>
                <p>gated block 2</p>
            `.trim());
        });

        it('handles malformed gated block comments', function () {
            const checkGatedBlockAccessStub = stubCheckGatedBlockAccess(true);
            const html = `
                <!--kg-gated-block:begin-><p>malformed gated block 1</p><!--kg-gated-block:end-->
                <p>Non-gated block</p>
                <!--kg-gated-block:begin <p>malformed gated block 2</p>
                <!--kg-gated-block:begin nonMember:true--><p>valid gated block</p><!--kg-gated-block:end-->
            `;
            const result = gating.stripGatedBlocks(html, null);
            sinon.assert.calledOnce(checkGatedBlockAccessStub);
            assert.equal(result.trim(), `
                <!--kg-gated-block:begin-><p>malformed gated block 1</p><!--kg-gated-block:end-->
                <p>Non-gated block</p>
                <!--kg-gated-block:begin <p>malformed gated block 2</p>
                <p>valid gated block</p>
            `.trim());
        });
    });
});
