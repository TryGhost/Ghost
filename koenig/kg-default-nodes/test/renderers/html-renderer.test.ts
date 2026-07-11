import assert from 'node:assert/strict';
import {callRenderer, visibility} from '../test-utils/index.js';

const {ALL_MEMBERS_SEGMENT, NO_MEMBERS_SEGMENT} = visibility;

describe('renderers/html-renderer', function () {
    function getTestData(overrides = {}) {
        return {
            html: '<p>Paragraph with:</p><ul><li>list</li><li>items</li></ul>',
            ...overrides
        };
    }

    function renderForWeb(data: Record<string, unknown>, options?: Record<string, unknown>) {
        return callRenderer('html', data, options);
    }

    function renderForEmail(data: Record<string, unknown>, options?: Record<string, unknown>) {
        return callRenderer('html', data, {...options, target: 'email'});
    }

    describe('web', function () {
        it('matches snapshot for default test data', function () {
            const result = renderForWeb(getTestData());

            assert.ok(result.html);

            // TODO: fix this, needs exact match because comments get lost in assertPrettifiesTo
            assert.equal(result.html, `
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
            const result = renderForWeb(getTestData({html: '<div style="color:red">'}));

            assert.equal(result.type, 'value');
            // do not prettify, it would add a closing tag to the compared string causing a false pass
            assert.equal(result.html, '\n<!--kg-card-begin: html-->\n<div style="color:red">\n<!--kg-card-end: html-->\n');
        });

        it('renders html entities', function () {
            const result = renderForWeb(getTestData({html: '<p>&lt;pre&gt;Test&lt;/pre&gt;</p>'}));

            assert.equal(result.type, 'value');
            assert.equal(result.html, '\n<!--kg-card-begin: html-->\n<p>&lt;pre&gt;Test&lt;/pre&gt;</p>\n<!--kg-card-end: html-->\n');
        });

        it('handles single-quote attributes', function () {
            const result = renderForWeb(getTestData({html: '<div data-graph-name=\'The "all-in" cost of a grant\'>Test</div>'}));

            assert.equal(result.type, 'value');
            assert.equal(result.html, '\n<!--kg-card-begin: html-->\n<div data-graph-name=\'The "all-in" cost of a grant\'>Test</div>\n<!--kg-card-end: html-->\n');
        });
    });

    describe('email', function () {
        it('matches snapshot for default test data', function () {
            const result = renderForEmail(getTestData());

            assert.ok(result.html);

            // TODO: fix this, needs exact match because comments get lost in assertPrettifiesTo
            assert.equal(result.html, `
<!--kg-card-begin: html-->
<p>Paragraph with:</p><ul><li>list</li><li>items</li></ul>
<!--kg-card-end: html-->
`);
        });

        it('renders nothing with a missing html', function () {
            const result = renderForEmail(getTestData({html: ''}));
            assert.equal(result.html, '');
        });

        it('wraps uniqueid replacement strings when emailUniqueid feature is enabled', function () {
            const htmlWithUniqueId = '<img src="https://ads.example.com/banner.jpg?id={uniqueid}" alt="Ad">';
            const result = renderForEmail(getTestData({html: htmlWithUniqueId}), {
                feature: {emailUniqueid: true}
            });

            assert.ok(result.html.includes('%%{uniqueid}%%'));
            assert.ok(!result.html.includes('>{uniqueid}<')); // Should not have unwrapped version
            assert.ok(result.html.includes('kg-card-begin: html'));
        });

        it('does not wrap uniqueid replacement strings when emailUniqueid feature is disabled', function () {
            const htmlWithUniqueId = '<img src="https://ads.example.com/banner.jpg?id={uniqueid}" alt="Ad">';
            const result = renderForEmail(getTestData({html: htmlWithUniqueId}), {
                feature: {emailUniqueid: false}
            });

            assert.ok(!result.html.includes('%%{uniqueid}%%'));
            assert.ok(result.html.includes('{uniqueid}'));
            assert.ok(result.html.includes('kg-card-begin: html'));
        });

        it('does not wrap uniqueid replacement strings when feature object is missing', function () {
            const htmlWithUniqueId = '<img src="https://ads.example.com/banner.jpg?id={uniqueid}" alt="Ad">';
            const result = renderForEmail(getTestData({html: htmlWithUniqueId}));

            assert.ok(!result.html.includes('%%{uniqueid}%%'));
            assert.ok(result.html.includes('{uniqueid}'));
            assert.ok(result.html.includes('kg-card-begin: html'));
        });

        it('wraps multiple replacement strings when emailUniqueid feature is enabled', function () {
            const htmlWithMultiple = '<img src="https://ads.example.com/banner.jpg?id={uniqueid}&name={first_name}" alt="Ad">';
            const result = renderForEmail(getTestData({html: htmlWithMultiple}), {
                feature: {emailUniqueid: true}
            });

            assert.ok(result.html.includes('%%{uniqueid}%%'));
            assert.ok(result.html.includes('%%{first_name}%%'));
            assert.ok(!result.html.includes('>{uniqueid}<'));
            assert.ok(!result.html.includes('>{first_name}<'));
        });
    });

    describe('visibility', function () {
        const expectedContents = '<!--kg-card-begin: html-->\n<div>Test</div>\n<!--kg-card-end: html-->';

        function getVisibilityTestData(cardVisibility: Record<string, unknown>) {
            return getTestData({html: '<div>Test</div>', visibility: cardVisibility});
        }

        function testBlankRender(cardVisibility: Record<string, unknown>, target: string) {
            const result = callRenderer('html', getVisibilityTestData(cardVisibility), target === 'email' ? {target: 'email'} : {});
            assert.equal(result.type, 'inner');
            assert.equal(result.html, '');
        }

        describe('with old visibility settings', function () {
            function testWebRender(cardVisibility: Record<string, unknown>) {
                const result = renderForWeb(getVisibilityTestData(cardVisibility));
                assert.equal(result.type, 'value');
                assert.equal(result.html, `\n${expectedContents}\n`);
            }

            function testEmailRender(cardVisibility: Record<string, unknown>) {
                const result = renderForEmail(getVisibilityTestData(cardVisibility));
                assert.equal(result.type, 'value');
                assert.equal(result.html, `\n${expectedContents}\n`);
            }

            it('renders on web but not email if showOnWeb is true and showOnEmail is false', function () {
                const cardVisibility = {showOnEmail: false, showOnWeb: true, segment: ''};
                testWebRender(cardVisibility);
                testBlankRender(cardVisibility, 'email');
            });

            it('renders on email and not web if showOnEmail is true and showOnWeb is false', function () {
                const cardVisibility = {showOnEmail: true, showOnWeb: false, segment: ''};
                testEmailRender(cardVisibility);
                testBlankRender(cardVisibility, 'web');
            });

            it('renders both on web and email if showOnEmail and showOnWeb are true', function () {
                const cardVisibility = {showOnEmail: true, showOnWeb: true, segment: ''};
                testWebRender(cardVisibility);
                testEmailRender(cardVisibility);
            });
        });

        describe('with new visibility settings', function () {
            function testWebRender(cardVisibility: Record<string, unknown>, expectedGateParams?: string | null) {
                const result = renderForWeb(getVisibilityTestData(cardVisibility));
                assert.equal(result.type, 'value');
                const baseExpectedContents = `\n${expectedContents}\n`;
                assert.equal(result.html, expectedGateParams ? `\n<!--kg-gated-block:begin ${expectedGateParams} -->${baseExpectedContents}<!--kg-gated-block:end-->\n` : baseExpectedContents);
            }

            function testEmailRender(cardVisibility: Record<string, unknown>, expectedSegment: string) {
                const result = renderForEmail(getVisibilityTestData(cardVisibility));

                if (!expectedSegment) {
                    assert.equal(result.type, 'value');
                    assert.equal(result.html, `\n${expectedContents}\n`);
                } else {
                    assert.equal(result.type, 'html');
                    assert.equal(result.html, `<div data-gh-segment="${expectedSegment}" class="kg-visibility-wrapper">\n${expectedContents}\n</div>`);
                }
            }

            it('web: excludes gated wrapper when shown to everyone', function () {
                const cardVisibility = {web: {nonMember: true, memberSegment: ALL_MEMBERS_SEGMENT}, email: {memberSegment: ALL_MEMBERS_SEGMENT}};
                testWebRender(cardVisibility, null);
            });

            it('web: includes gated wrapper with member-only params', function () {
                const cardVisibility = {web: {nonMember: false, memberSegment: ALL_MEMBERS_SEGMENT}, email: {memberSegment: ALL_MEMBERS_SEGMENT}};
                testWebRender(cardVisibility, 'nonMember:false memberSegment:"status:free,status:-free"');
            });

            it('web: includes gated wrapper with anonymous-only params', function () {
                const cardVisibility = {web: {nonMember: true, memberSegment: ''}, email: {memberSegment: ALL_MEMBERS_SEGMENT}};
                testWebRender(cardVisibility, 'nonMember:true memberSegment:""');
            });

            it('email: excludes content when hidden from all members', function () {
                const cardVisibility = {web: {nonMember: true, memberSegment: NO_MEMBERS_SEGMENT}, email: {memberSegment: ''}};
                testBlankRender(cardVisibility, 'email');
            });

            it('email: skips segment wrapper when sent to all members', function () {
                const cardVisibility = {web: {nonMember: true, memberSegment: ALL_MEMBERS_SEGMENT}, email: {memberSegment: ALL_MEMBERS_SEGMENT}};
                testWebRender(cardVisibility);
                testEmailRender(cardVisibility, '');
            });

            it('email: includes content with member segment wrapper', function () {
                const cardVisibility = {web: {nonMember: true, memberSegment: ALL_MEMBERS_SEGMENT}, email: {memberSegment: 'status:free'}};
                testEmailRender(cardVisibility, 'status:free');
            });

            it('handles web-only (everyone)', function () {
                const cardVisibility = {web: {nonMember: true, memberSegment: ALL_MEMBERS_SEGMENT}, email: {memberSegment: NO_MEMBERS_SEGMENT}};
                testWebRender(cardVisibility);
                testBlankRender(cardVisibility, 'email');
            });

            it('handles web-only (members-only)', function () {
                const cardVisibility = {web: {nonMember: false, memberSegment: ALL_MEMBERS_SEGMENT}, email: {memberSegment: NO_MEMBERS_SEGMENT}};
                testWebRender(cardVisibility, 'nonMember:false memberSegment:"status:free,status:-free"');
                testBlankRender(cardVisibility, 'email');
            });

            it('handles email-only (free members)', function () {
                const cardVisibility = {web: {nonMember: false, memberSegment: NO_MEMBERS_SEGMENT}, email: {memberSegment: 'status:free'}};
                testBlankRender(cardVisibility, 'web');
                testEmailRender(cardVisibility, 'status:free');
            });

            it('handles visibility for no-one', function () {
                const cardVisibility = {web: {nonMember: false, memberSegment: NO_MEMBERS_SEGMENT}, email: {memberSegment: NO_MEMBERS_SEGMENT}};
                testBlankRender(cardVisibility, 'web');
                testBlankRender(cardVisibility, 'email');
            });
        });
    });
});
