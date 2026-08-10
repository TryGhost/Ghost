import assert from 'node:assert/strict';
import {assertPrettifiedIncludes, assertPrettifiesTo, callRenderer, html, visibility} from '../test-utils/index.js';

describe('renderers/call-to-action-renderer', function () {
    function getTestData(overrides = {}) {
        return {
            layout: 'minimal',
            textValue: 'This is a cool advertisement',
            sponsorLabel: '<p><span style="white-space: pre-wrap;">SPONSORED</span></p>',
            showButton: true,
            showDividers: true,
            buttonText: 'click me',
            buttonUrl: 'http://blog.com/post1',
            buttonColor: '#000000',
            buttonTextColor: '#ffffff',
            hasSponsorLabel: true,
            backgroundColor: 'none',
            imageUrl: 'http://blog.com/image1.jpg',
            imageWidth: 200,
            imageHeight: 100,
            linkColor: 'text',
            visibility: visibility.buildDefaultVisibility(),
            ...overrides
        };
    }

    function renderForWeb(data: Record<string, unknown>, options?: Record<string, unknown>) {
        return callRenderer('call-to-action', data, options);
    }

    function renderForEmail(data: Record<string, unknown>, options?: Record<string, unknown>) {
        return callRenderer('call-to-action', data, {...options, target: 'email'});
    }

    function testButtonSkipOnMissingData(target: string, layout: string, {missing = [] as string[]} = {}) {
        return function () {
            const data = getTestData({
                layout,
                showButton: true,
                showDividers: true,
                buttonUrl: 'http://blog.com/post1',
                buttonText: 'Click me'
            });

            missing.forEach((prop) => {
                (data as Record<string, unknown>)[prop] = '';
            });

            const result = target === 'email' ? renderForEmail(data, {feature: {}}) : renderForWeb(data);

            assert.ok(!result.html.includes('<a href="http://blog.com/post1"'));
            assert.ok(!result.html.includes('Click me'));
        };
    }

    function testSkippedImageLink(target: string, layout: string) {
        return function () {
            const data = getTestData({layout, showButton: false});
            const result = target === 'email' ? renderForEmail(data, {feature: {}}) : renderForWeb(data);

            assert.ok(!result.html.includes('<a href="http://blog.com/post1"><img'));
        };
    }

    describe('web', function () {
        it('matches snapshot for default test data', function () {
            const result = renderForWeb(getTestData());

            assert.ok(result.html);

            assertPrettifiesTo(result.html, html`
                <div class="kg-card kg-cta-card kg-cta-bg-none kg-cta-minimal kg-cta-has-img" data-layout="minimal">
                    <div class="kg-cta-sponsor-label-wrapper">
                        <div class="kg-cta-sponsor-label">
                            <span style="white-space: pre-wrap">SPONSORED</span>
                        </div>
                    </div>
                    <div class="kg-cta-content">
                        <div class="kg-cta-image-container">
                            <a href="http://blog.com/post1">
                                <img
                                    src="http://blog.com/image1.jpg"
                                    alt="CTA Image"
                                    data-image-dimensions="200x100"
                                />
                            </a>
                        </div>
                        <div class="kg-cta-content-inner">
                            <div class="kg-cta-text">This is a cool advertisement</div>
                            <a
                                href="http://blog.com/post1"
                                class="kg-cta-button"
                                style="background-color: #000000; color: #ffffff;"
                            >
                                click me
                            </a>
                        </div>
                    </div>
                </div>
            `);
        });

        it('does not render img tag when imageUrl is null', function () {
            const result = renderForWeb(getTestData({imageUrl: null}));

            assert.ok(!result.html.includes('<img src="http://blog.com/image1.jpg" alt="CTA Image">'));
        });

        it('should render with web visibility', function () {
            const result = renderForWeb(getTestData({
                visibility: {...visibility.buildDefaultVisibility(), web: {nonMember: false, memberSegment: 'status:free,status:-free'}}
            }));

            assert.equal(result.element.tagName, 'TEXTAREA');
            assert.match(result.html, /<!--kg-gated-block:begin nonMember:false memberSegment:"status:free,status:-free" -->/);
        });

        it('skips button when buttonUrl is empty (web, minimal)', testButtonSkipOnMissingData('web', 'minimal', {missing: ['buttonUrl']}));
        it('skips button when buttonText is empty (web, minimal)', testButtonSkipOnMissingData('web', 'minimal', {missing: ['buttonText']}));

        it('skips link to image when button is not shown (web)', testSkippedImageLink('web', 'minimal'));

        it('accepts valid hex color for buttonColor', function () {
            const result = renderForWeb(getTestData({buttonColor: '#F0F0F0'}));

            assert.ok(result.html.includes('background-color: #F0F0F0'));
        });

        it('accepts valid named color for buttonColor', function () {
            const result = renderForWeb(getTestData({buttonColor: 'blue'}));

            assert.ok(result.html.includes('background-color: blue'));
        });

        it('falls back to accent for partially valid buttonColor', function () {
            const result = renderForWeb(getTestData({buttonColor: 'blue!'}));

            assert.ok(result.html.includes('kg-style-accent'));
            assert.ok(!result.html.includes('background-color: blue!'));
        });

        it('falls back to accent for buttonColor with attribute breakout attempt', function () {
            const result = renderForWeb(getTestData({buttonColor: 'red" onmouseover="alert(1)'}));

            assert.ok(result.html.includes('kg-style-accent'));
            assert.ok(!result.html.includes('onmouseover'));
        });

        it('falls back to default backgroundColor for partially valid backgroundColor', function () {
            const result = renderForWeb(getTestData({backgroundColor: 'green" onmouseover="alert(1)'}));

            assert.ok(result.html.includes('kg-cta-bg-white'));
            assert.ok(!result.html.includes('onmouseover'));
        });

        it('renders with left alignment by default', function () {
            const result = renderForWeb(getTestData({alignment: 'left'}));

            assert.ok(!result.html.includes('kg-cta-centered'));
        });

        it('renders with center alignment when specified', function () {
            const result = renderForWeb(getTestData({alignment: 'center'}));

            assert.ok(result.html.includes('kg-cta-centered'));
        });

        it('renders with accent link color', function () {
            const result = renderForWeb(getTestData({linkColor: 'accent'}));

            assert.ok(result.html.includes('kg-cta-link-accent'));
        });
    });

    describe('email', function () {
        it('matches snapshot for default test data', function () {
            const result = renderForEmail(getTestData(), {feature: {}});

            assert.ok(result.html);

            assertPrettifiesTo(result.html, html`
                <table class="kg-card kg-cta-card kg-cta-bg-none kg-cta-minimal kg-cta-has-img" border="0" cellpadding="0" cellspacing="0" width="100%">
                    <tbody>
                        <tr>
                            <td>
                                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                    <tbody>
                                        <tr>
                                            <td class="kg-cta-sponsor-label">
                                                <p><span style="white-space: pre-wrap">SPONSORED</span></p>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </td>
                        </tr>
                        <tr>
                            <td class="kg-cta-content">
                                <table border="0" cellpadding="0" cellspacing="0" width="100%" class="kg-cta-content-wrapper">
                                    <tbody>
                                        <tr>
                                            <td class="kg-cta-image-container" width="64">
                                                <a href="http://blog.com/post1">
                                                    <img src="http://blog.com/image1.jpg" alt="CTA Image" class="kg-cta-image" width="64" height="64"/>
                                                </a>
                                            </td>
                                            <td class="kg-cta-content-inner">
                                                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                                    <tbody>
                                                        <tr>
                                                            <td class="kg-cta-text">This is a cool advertisement</td>
                                                        </tr>
                                                        <tr>
                                                            <td class="kg-cta-button-container">
                                                                <table class="btn" border="0" cellspacing="0" cellpadding="0">
                                                                    <tbody>
                                                                        <tr>
                                                                            <td align="center" style="background-color: #000000;">
                                                                                <a href="http://blog.com/post1" style="color: #ffffff !important;">
                                                                                    click me
                                                                                </a>
                                                                            </td>
                                                                        </tr>
                                                                    </tbody>
                                                                </table>
                                                            </td>
                                                        </tr>
                                                    </tbody>
                                                </table>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </td>
                        </tr>
                    </tbody>
                </table>
            `);
        });

        it('uses cropped image when layout is minimal', function () {
            const result = renderForEmail(getTestData({
                backgroundColor: 'green',
                buttonColor: '#F0F0F0',
                buttonText: 'Get access now',
                buttonTextColor: '#000000',
                buttonUrl: 'http://someblog.com/somepost',
                imageUrl: '/content/images/2022/11/koenig-lexical.jpg',
                layout: 'minimal',
                textValue: '<p><span style="white-space: pre-wrap;">This is a new CTA Card via email.</span></p>'
            }), {
                feature: {},
                imageOptimization: {
                    internalImageSizes: {
                        'email-cta-minimal-image': {width: 64, height: 64}
                    }
                }
            });

            assert.ok(result.html.includes('kg-cta-bg-green'));
            assert.ok(result.html.includes('background-color: #F0F0F0'));
            assert.ok(result.html.includes('Get access now'));
            assert.ok(result.html.includes('href="http://someblog.com/somepost"'));
            assert.ok(result.html.includes('<p><span style="white-space: pre-wrap;">SPONSORED</span></p>'));
            assert.ok(result.html.includes('/content/images/size/w64h64/2022/11/koenig-lexical.jpg'));
            assert.ok(result.html.includes('This is a new CTA Card via email.'));
        });

        it('cropped image defaults to 256 if no imageOptimization.internalImageSizes are provided', function () {
            const result = renderForEmail(getTestData({
                imageUrl: '/content/images/2022/11/koenig-lexical.jpg',
                layout: 'minimal'
            }), {feature: {}});

            assert.ok(result.html.includes('/content/images/size/w256h256/2022/11/koenig-lexical.jpg'));
        });

        it('renders email with img width and height when immersive', function () {
            const result = renderForEmail(getTestData({
                imageUrl: '/content/images/2022/11/koenig-lexical.jpg',
                imageWidth: 200,
                imageHeight: 100,
                layout: 'immersive'
            }), {feature: {}});

            assert.ok(result.html.includes('<img src="/content/images/2022/11/koenig-lexical.jpg" alt="CTA Image" class="kg-cta-image" width="200" height="100">'));
        });

        it('should render with email visibility', function () {
            const result = renderForEmail(getTestData({
                visibility: {...visibility.buildDefaultVisibility(), email: {memberSegment: 'status:free'}}
            }), {feature: {}});

            assert.equal(result.type, 'html');
            assert.equal(result.element.tagName, 'DIV');
            assert.equal(result.element.dataset.ghSegment, 'status:free');
        });

        it('skips button when buttonUrl is empty (email, minimal)', testButtonSkipOnMissingData('email', 'minimal', {missing: ['buttonUrl']}));
        it('skips button when buttonUrl is empty (email, immersive)', testButtonSkipOnMissingData('email', 'immersive', {missing: ['buttonUrl']}));
        it('skips button when buttonText is empty (email, minimal)', testButtonSkipOnMissingData('email', 'minimal', {missing: ['buttonText']}));
        it('skips button when buttonText is empty (email, immersive)', testButtonSkipOnMissingData('email', 'immersive', {missing: ['buttonText']}));

        it('adds link to image when button is present with url (email, immersive)', function () {
            const result = renderForEmail(getTestData({layout: 'immersive'}), {feature: {}});

            assert.ok(result.html.includes('<a href="http://blog.com/post1"><img'));
        });

        it('skips link to image when button is not shown (email, minimal)', testSkippedImageLink('email', 'minimal'));
        it('skips link to image when button is not shown (email, immersive)', testSkippedImageLink('email', 'immersive'));

        ['emailCustomization', 'emailCustomizationAlpha'].forEach((flag) => {
            it(`can render email with ${flag}`, function () {
                const result = renderForEmail(getTestData(), {feature: {[flag]: true}});

                assert.equal(result.element.tagName, 'TABLE');
                assert.ok(result.element.querySelector('table.btn'), 'table.btn element should exist');
            });

            it(`can render outline accent buttons (${flag})`, function () {
                const result = renderForEmail(getTestData({buttonColor: 'accent'}), {
                    feature: {[flag]: true},
                    design: {buttonStyle: 'outline'}
                });

                // accent buttons are fully styled by the main email template CSS
                assert.equal(result.element.querySelector('table.btn td').getAttribute('style'), null);
                assert.equal(result.element.querySelector('table.btn a').getAttribute('style'), null);
            });

            it(`can render outline custom buttons (${flag})`, function () {
                const result = renderForEmail(getTestData({buttonColor: '#F0F0F0'}), {
                    feature: {[flag]: true},
                    design: {buttonStyle: 'outline'}
                });

                assertPrettifiedIncludes(result.html, html`
                    <table class="btn" border="0" cellspacing="0" cellpadding="0">
                        <tbody>
                            <tr>
                                <td align="center" style="color: #F0F0F0 !important; border: 1px solid #F0F0F0; border-color: currentColor; background-color: transparent;">
                                    <a href="http://blog.com/post1" style="color: #F0F0F0 !important;">
                                        click me
                                    </a>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                `);
            });
        });

        it('handles accent button color', function () {
            const data = getTestData({buttonColor: 'accent'});
            const result = renderForEmail(data, {feature: {}});

            assertPrettifiedIncludes(result.html, html`
                <table class="btn btn-accent" border="0" cellspacing="0" cellpadding="0">
                    <tbody>
                        <tr>
                            <td align="center">
                                <a href="http://blog.com/post1">
                                    click me
                                </a>
                            </td>
                        </tr>
                    </tbody>
                </table>
            `);
        });

        it('handles outline buttons', function () {
            const data = getTestData();
            const result = renderForEmail(data, {design: {buttonStyle: 'outline'}, feature: {}});

            assertPrettifiedIncludes(result.html, html`
                <table class="btn" border="0" cellspacing="0" cellpadding="0">
                    <tbody>
                        <tr>
                            <td align="center" style="color: #000000 !important; border: 1px solid #000000; border-color: currentColor; background-color: transparent;">
                                <a href="http://blog.com/post1" style="color: #000000 !important;">
                                    click me
                                </a>
                            </td>
                        </tr>
                    </tbody>
                </table>
            `);
        });

        it('converts black button to white on dark background with transparent CTA', function () {
            const data = getTestData({
                backgroundColor: 'none',
                buttonColor: 'black'
            });
            const result = renderForEmail(data, {
                design: {backgroundIsDark: true},
                feature: {}
            });

            assertPrettifiedIncludes(result.html, html`
                <table class="btn" border="0" cellspacing="0" cellpadding="0">
                    <tbody>
                        <tr>
                            <td align="center" style="background-color: white;">
                                <a href="http://blog.com/post1" style="color: #000000 !important;">
                                    click me
                                </a>
                            </td>
                        </tr>
                    </tbody>
                </table>
            `);
        });

        it('converts #000000 button to white on dark background when CTA background is transparent', function () {
            const data = getTestData({
                backgroundColor: 'none',
                buttonColor: '#000000'
            });
            const result = renderForEmail(data, {
                design: {backgroundIsDark: true},
                feature: {}
            });

            assertPrettifiedIncludes(result.html, html`
                <table class="btn" border="0" cellspacing="0" cellpadding="0">
                    <tbody>
                        <tr>
                            <td align="center" style="background-color: white;">
                                <a href="http://blog.com/post1" style="color: #000000 !important;">
                                    click me
                                </a>
                            </td>
                        </tr>
                    </tbody>
                </table>
            `);
        });

        it('converts #000 button to white on dark background when CTA background is transparent', function () {
            const data = getTestData({
                backgroundColor: 'none',
                buttonColor: '#000'
            });
            const result = renderForEmail(data, {
                design: {backgroundIsDark: true},
                feature: {}
            });

            assertPrettifiedIncludes(result.html, html`
                <table class="btn" border="0" cellspacing="0" cellpadding="0">
                    <tbody>
                        <tr>
                            <td align="center" style="background-color: #ffffff;">
                                <a href="http://blog.com/post1" style="color: #000000 !important;">
                                    click me
                                </a>
                            </td>
                        </tr>
                    </tbody>
                </table>
            `);
        });

        it('converts #000000 button to white on dark background when CTA background is white', function () {
            const data = getTestData({
                backgroundColor: 'white',
                buttonColor: '#000000'
            });
            const result = renderForEmail(data, {
                design: {backgroundIsDark: true},
                feature: {}
            });

            assertPrettifiedIncludes(result.html, html`
                <table class="btn" border="0" cellspacing="0" cellpadding="0">
                    <tbody>
                        <tr>
                            <td align="center" style="background-color: white;">
                                <a href="http://blog.com/post1" style="color: #000000 !important;">
                                    click me
                                </a>
                            </td>
                        </tr>
                    </tbody>
                </table>
            `);
        });

        it('converts #000 button to white on dark background when CTA background is white', function () {
            const data = getTestData({
                backgroundColor: 'white',
                buttonColor: '#000'
            });
            const result = renderForEmail(data, {
                design: {backgroundIsDark: true},
                feature: {}
            });

            assertPrettifiedIncludes(result.html, html`
                <table class="btn" border="0" cellspacing="0" cellpadding="0">
                    <tbody>
                        <tr>
                            <td align="center" style="background-color: white;">
                                <a href="http://blog.com/post1" style="color: #000000 !important;">
                                    click me
                                </a>
                            </td>
                        </tr>
                    </tbody>
                </table>
            `);
        });

        it('does not convert black button when background is not dark', function () {
            const data = getTestData({
                backgroundColor: 'none',
                buttonColor: '#000000'
            });
            const result = renderForEmail(data, {
                design: {backgroundIsDark: false},
                feature: {}
            });

            assertPrettifiedIncludes(result.html, html`
                <table class="btn" border="0" cellspacing="0" cellpadding="0">
                    <tbody>
                        <tr>
                            <td align="center" style="background-color: #000000;">
                                <a href="http://blog.com/post1" style="color: #ffffff !important;">
                                    click me
                                </a>
                            </td>
                        </tr>
                    </tbody>
                </table>
            `);
        });

        it('does not convert black button when CTA background is not transparent or white', function () {
            const data = getTestData({
                backgroundColor: 'blue',
                buttonColor: '#000000'
            });
            const result = renderForEmail(data, {
                design: {backgroundIsDark: true},
                feature: {}
            });

            assertPrettifiedIncludes(result.html, html`
                <table class="btn" border="0" cellspacing="0" cellpadding="0">
                    <tbody>
                        <tr>
                            <td align="center" style="background-color: #000000;">
                                <a href="http://blog.com/post1" style="color: #ffffff !important;">
                                    click me
                                </a>
                            </td>
                        </tr>
                    </tbody>
                </table>
            `);
        });
    });
});
