const assert = require('assert/strict');
const {callRenderer} = require('../test-utils');
const assertPrettifiesTo = require('../test-utils/assert-prettifies-to');
const {ALL_MEMBERS_SEGMENT, NO_MEMBERS_SEGMENT} = require('../test-utils/visibility');

describe('services/koenig/node-renderers/html-renderer', function () {
    function getTestData(overrides = {}) {
        return {
            html: '<p>Paragraph with:</p><ul><li>list</li><li>items</li></ul>',
            ...overrides
        };
    }

    function renderForWeb(data, options) {
        return callRenderer('html', data, options);
    }

    function renderForEmail(data, options) {
        return callRenderer('html', data, {...options, target: 'email'});
    }

    describe('web', function () {
        it('matches snapshot for default test data', function () {
            const result = renderForWeb(getTestData());

            assertPrettifiesTo(result.html, `
                <!--kg-card-begin: html-->
                <p>Paragraph with:</p><ul><li>list</li><li>items</li></ul>
                <!--kg-card-end: html-->
            `);
        });

        it('renders nothing with a missing html', function () {
            const result = renderForWeb(getTestData({html: ''}));
            assert.equal(result.html, '');
        });

        it('renders unclosed tags', function () {
            const result = renderForWeb({html: '<div style="color:red">'});

            // do not prettify, it will add a closing tag to the compared string causing a false pass
            assert.equal(result.element.value, '\n<!--kg-card-begin: html-->\n<div style="color:red">\n<!--kg-card-end: html-->\n');
        });

        it('renders html entities', function () {
            const result = renderForWeb({html: '<p>&lt;pre&gt;Test&lt;/pre&gt;</p>'});

            assert.equal(result.element.value, '\n<!--kg-card-begin: html-->\n<p>&lt;pre&gt;Test&lt;/pre&gt;</p>\n<!--kg-card-end: html-->\n');
        });

        it('handles single-quote attributes', function () {
            const result = renderForWeb({html: '<div data-graph-name=\'The "all-in" cost of a grant\'>Test</div>'});

            assert.equal(result.element.value, '\n<!--kg-card-begin: html-->\n<div data-graph-name=\'The "all-in" cost of a grant\'>Test</div>\n<!--kg-card-end: html-->\n');
        });

        describe('feature.contentVisibility', function () {
            describe('with old visibility settings', function () {
                function testWebRender(visibility) {
                    const result = renderForWeb({html: '<div>Test</div>', visibility}, {
                        feature: {contentVisibility: true}
                    });
                    assert.equal(result.type, 'value');
                    assert.equal(result.element.value, '\n<!--kg-card-begin: html-->\n<div>Test</div>\n<!--kg-card-end: html-->\n');
                }

                function testEmailRender(visibility) {
                    const result = renderForEmail({html: '<div>Test</div>', visibility}, {
                        feature: {contentVisibility: true}
                    });
                    const expectedContents = '<!--kg-card-begin: html-->\n<div>Test</div>\n<!--kg-card-end: html-->';

                    if (visibility.segment) {
                        assert.equal(result.type, 'html');
                        assert.equal(result.element.outerHTML, `<div data-gh-segment="${visibility.segment}">\n${expectedContents}\n</div>`);
                    } else {
                        assert.equal(result.type, 'value');
                        assert.equal(result.element.value, `\n${expectedContents}\n`);
                    }
                }

                function testBlankRender(visibility, target) {
                    const result = callRenderer('html', {html: '<div>Test</div>', visibility}, {
                        target,
                        feature: {contentVisibility: true}
                    });
                    assert.equal(result.type, 'inner');
                    assert.equal(result.element.innerHTML, '');
                }

                it('renders on web but not email if showOnWeb is true and showOnEmail is false', function () {
                    const visibility = {showOnEmail: false, showOnWeb: true, segment: ''};
                    testWebRender(visibility);
                    testBlankRender(visibility, 'email');
                });

                it('renders on email and not web if showOnEmail is true and showOnWeb is false', function () {
                    const visibility = {showOnEmail: true, showOnWeb: false, segment: ''};
                    testEmailRender(visibility);
                    testBlankRender(visibility, 'web');
                });

                it('renders both on web and email if showOnEmail and showOnWeb are true', function () {
                    const visibility = {showOnEmail: true, showOnWeb: true, segment: ''};
                    testWebRender(visibility);
                    testEmailRender(visibility);
                });
            });

            describe('with new visibility settings', function () {
                function testWebRender(visibility, expectedGateParams) {
                    const result = renderForWeb({html: '<div>Test</div>', visibility}, {
                        feature: {contentVisibility: true}
                    });
                    assert.equal(result.type, 'value');
                    const baseExpectedContents = '\n<!--kg-card-begin: html-->\n<div>Test</div>\n<!--kg-card-end: html-->\n';
                    assert.equal(result.element.value, expectedGateParams ? `\n<!--kg-gated-block:begin ${expectedGateParams} -->${baseExpectedContents}<!--kg-gated-block:end-->\n` : baseExpectedContents);
                }

                function testEmailRender(visibility, expectedSegment) {
                    const result = renderForEmail({html: '<div>Test</div>', visibility}, {
                        feature: {contentVisibility: true}
                    });
                    const expectedContents = '<!--kg-card-begin: html-->\n<div>Test</div>\n<!--kg-card-end: html-->';

                    if (!expectedSegment) {
                        assert.equal(result.type, 'value');
                        assert.equal(result.element.value, `\n${expectedContents}\n`);
                    } else {
                        assert.equal(result.type, 'html');
                        assert.equal(result.element.outerHTML, `<div data-gh-segment="${expectedSegment}" class="kg-visibility-wrapper">\n${expectedContents}\n</div>`);
                    }
                }

                function testBlankRender(visibility, target) {
                    const result = callRenderer('html', {html: '<div>Test</div>', visibility}, {
                        target,
                        feature: {contentVisibility: true}
                    });
                    assert.equal(result.type, 'inner');
                    assert.equal(result.element.innerHTML, '');
                }

                it('web: excludes gated wrapper when shown to everyone', function () {
                    const visibility = {web: {nonMember: true, memberSegment: ALL_MEMBERS_SEGMENT}, email: {memberSegment: ALL_MEMBERS_SEGMENT}};
                    testWebRender(visibility, null);
                });

                it('web: includes gated wrapper with member-only params', function () {
                    const visibility = {web: {nonMember: false, memberSegment: ALL_MEMBERS_SEGMENT}, email: {memberSegment: ALL_MEMBERS_SEGMENT}};
                    testWebRender(visibility, 'nonMember:false memberSegment:"status:free,status:-free"');
                });

                it('web: includes gated wrapper with anonymous-only params', function () {
                    const visibility = {web: {nonMember: true, memberSegment: ''}, email: {memberSegment: ALL_MEMBERS_SEGMENT}};
                    testWebRender(visibility, 'nonMember:true memberSegment:""');
                });

                it('email: excludes content when hidden from all members', function () {
                    const visibility = {web: {nonMember: true, memberSegment: NO_MEMBERS_SEGMENT}, email: {memberSegment: ''}};
                    testBlankRender(visibility, 'email');
                });

                it('email: skips segment wrapper when sent to all members', function () {
                    const visibility = {web: {nonMember: true, memberSegment: ALL_MEMBERS_SEGMENT}, email: {memberSegment: ALL_MEMBERS_SEGMENT}};
                    testWebRender(visibility);
                    testEmailRender(visibility, '');
                });

                it('email: includes content with member segment wrapper', function () {
                    const visibility = {web: {nonMember: true, memberSegment: ALL_MEMBERS_SEGMENT}, email: {memberSegment: 'status:free'}};
                    testEmailRender(visibility, 'status:free');
                });

                it('handles web-only (everyone)', function () {
                    const visibility = {web: {nonMember: true, memberSegment: ALL_MEMBERS_SEGMENT}, email: {memberSegment: NO_MEMBERS_SEGMENT}};
                    testWebRender(visibility);
                    testBlankRender(visibility, 'email');
                });

                it('handles web-only (members-only)', function () {
                    const visibility = {web: {nonMember: false, memberSegment: ALL_MEMBERS_SEGMENT}, email: {memberSegment: NO_MEMBERS_SEGMENT}};
                    testWebRender(visibility, 'nonMember:false memberSegment:"status:free,status:-free"');
                    testBlankRender(visibility, 'email');
                });

                it('handles email-only (free members)', function () {
                    const visibility = {web: {nonMember: false, memberSegment: NO_MEMBERS_SEGMENT}, email: {memberSegment: 'status:free'}};
                    testBlankRender(visibility, 'web');
                    testEmailRender(visibility, 'status:free');
                });

                it('handles visibility for no-one', function () {
                    const visibility = {web: {nonMember: false, memberSegment: NO_MEMBERS_SEGMENT}, email: {memberSegment: NO_MEMBERS_SEGMENT}};
                    testBlankRender(visibility, 'web');
                    testBlankRender(visibility, 'email');
                });
            });
        });
    });

    describe('email', function () {
        it('matches snapshot for default test data', function () {
            const result = renderForEmail(getTestData());

            assertPrettifiesTo(result.html, `
                <!--kg-card-begin: html-->
                <p>Paragraph with:</p><ul><li>list</li><li>items</li></ul>
                <!--kg-card-end: html-->
            `);
        });

        it('renders nothing with a missing html', function () {
            const result = renderForEmail(getTestData({html: ''}));
            assert.equal(result.html, '');
        });
    });
});
