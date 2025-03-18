const assert = require('assert/strict');
const sinon = require('sinon');
const {parseGatedBlockParams, removeGatedBlocksFromHtml} = require('../../../../../core/server/services/content-gating/gated-blocks');

describe('Content gating service', function () {
    afterEach(function () {
        sinon.restore();
    });

    describe('parseGatedBlockParams', function () {
        function testFn(input, expected) {
            const params = parseGatedBlockParams(input);
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

    describe('removeGatedBlocksFromHtml', function () {
        it('handles content with no gated blocks', function () {
            const checkGatedBlockAccessStub = sinon.stub().returns(true);
            const html = '<p>no gated blocks</p>';
            const result = removeGatedBlocksFromHtml(html, {}, checkGatedBlockAccessStub);
            assert.equal(result, html);
            sinon.assert.notCalled(checkGatedBlockAccessStub);
        });

        it('handles content with only a denied gated block', function () {
            const checkGatedBlockAccessStub = sinon.stub().returns(false);
            const html = '<!--kg-gated-block:begin nonMember:false--><p>gated blocks</p><!--kg-gated-block:end-->';
            const result = removeGatedBlocksFromHtml(html, {}, checkGatedBlockAccessStub);
            sinon.assert.calledWith(checkGatedBlockAccessStub, {nonMember: false}, {});
            assert.equal(result, '');
        });

        it('handles content with only a permitted gated block', function () {
            const checkGatedBlockAccessStub = sinon.stub().returns(true);
            const html = '<!--kg-gated-block:begin nonMember:true--><p>gated blocks</p><!--kg-gated-block:end-->';
            const result = removeGatedBlocksFromHtml(html, {}, checkGatedBlockAccessStub);
            sinon.assert.calledWith(checkGatedBlockAccessStub, {nonMember: true}, {});
            assert.equal(result, '<p>gated blocks</p>');
        });

        it('handles content with multiple permitted blocks', function () {
            const checkGatedBlockAccessStub = sinon.stub().returns(true);
            const html = `
                    <!--kg-gated-block:begin nonMember:true--><p>gated block 1</p><!--kg-gated-block:end-->
                    <p>Non-gated block</p>
                    <!--kg-gated-block:begin nonMember:true--><p>gated block 2</p><!--kg-gated-block:end-->
                `;
            const result = removeGatedBlocksFromHtml(html, {}, checkGatedBlockAccessStub);
            sinon.assert.calledTwice(checkGatedBlockAccessStub);
            assert.equal(result, `
                    <p>gated block 1</p>
                    <p>Non-gated block</p>
                    <p>gated block 2</p>
                `);
        });

        it('handles mix of permitted and denied blocks', function () {
            const checkGatedBlockAccessStub = sinon.stub()
                .onFirstCall().returns(false)
                .onSecondCall().returns(true);
            const html = `
                    <!--kg-gated-block:begin nonMember:true--><p>gated block 1</p><!--kg-gated-block:end-->
                    <p>Non-gated block</p>
                    <!--kg-gated-block:begin nonMember:false--><p>gated block 2</p><!--kg-gated-block:end-->
                `;
            const result = removeGatedBlocksFromHtml(html, null, checkGatedBlockAccessStub);
            sinon.assert.calledTwice(checkGatedBlockAccessStub);
            assert.equal(result.trim(), `
                    <p>Non-gated block</p>
                    <p>gated block 2</p>
                `.trim());
        });

        it('handles malformed gated block comments', function () {
            const checkGatedBlockAccessStub = sinon.stub().returns(true);
            const html = `
                    <!--kg-gated-block:begin-><p>malformed gated block 1</p><!--kg-gated-block:end-->
                    <p>Non-gated block</p>
                    <!--kg-gated-block:begin <p>malformed gated block 2</p>
                    <!--kg-gated-block:begin nonMember:true--><p>valid gated block</p><!--kg-gated-block:end-->
                `;
            const result = removeGatedBlocksFromHtml(html, null, checkGatedBlockAccessStub);
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
