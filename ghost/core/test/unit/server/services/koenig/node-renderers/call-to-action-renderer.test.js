const assert = require('assert/strict');
const {callRenderer, html, assertPrettifiesTo, assertPrettifiedIncludes, visibility} = require('../test-utils');

const LAYOUTS = ['minimal', 'immersive'];

describe('services/koenig/node-renderers/call-to-action-renderer', function () {
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

    function renderForWeb(data, options) {
        return callRenderer('call-to-action', data, options);
    }

    function renderForEmail(data, options) {
        return callRenderer('call-to-action', data, {...options, target: 'email'});
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

        it('renders with visibility', function () {
            const result = renderForWeb(getTestData({
                visibility: {...visibility.buildDefaultVisibility(), web: {nonMember: false, memberSegment: 'status:free'}}
            }));

            assert.equal(result.type, 'value');
            assert.equal(result.element.tagName, 'TEXTAREA');
            assert.match(result.element.value, /<!--kg-gated-block:begin nonMember:false memberSegment:"status:free" -->/);
        });

        it('removes <p> first child tag from sponsor label', function () {
            const result = renderForWeb(getTestData({
                sponsorLabel: '<p><span style="white-space: pre-wrap;">SPONSORED</span></p>'
            }));

            const sponsorLabel = result.element.querySelector('.kg-cta-sponsor-label');
            assert.equal(sponsorLabel.firstElementChild.tagName, 'SPAN');
            assert.equal(sponsorLabel.firstElementChild.outerHTML, '<span style="white-space: pre-wrap;">SPONSORED</span>');
        });

        LAYOUTS.forEach((layout) => {
            ['buttonUrl', 'buttonText'].forEach((key) => {
                it(`skips button render on missing ${key} (${layout})`, function () {
                    const result = renderForWeb(getTestData({layout, [key]: null}));
                    assert.equal(result.element.querySelector('.kg-cta-button'), null);
                });
            });
        });

        it('adds link to image when button is present with url', function () {
            const result = renderForWeb(getTestData({buttonUrl: 'http://blog.com/post1'}));
            assert(result.html.includes('<a href="http://blog.com/post1"><img'));
        });

        it('skips link to image when button is not present', function () {
            const result = renderForWeb(getTestData({buttonUrl: null}));
            assert(!result.html.includes('<a href="http://blog.com/post1"><img'));
        });
    });

    describe('email', function () {
        it('matches snapshot for default test data', function () {
            const result = renderForEmail(getTestData());

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

        it('matches snapshot for minimal layout', function () {
            const result = renderForEmail(getTestData({layout: 'minimal'}));

            assertPrettifiesTo(result.html, html`
                <table
                  class="kg-card kg-cta-card kg-cta-bg-none kg-cta-minimal kg-cta-has-img"
                  border="0"
                  cellpadding="0"
                  cellspacing="0"
                  width="100%">
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
                        <table
                          border="0"
                          cellpadding="0"
                          cellspacing="0"
                          width="100%"
                          class="kg-cta-content-wrapper">
                          <tbody>
                            <tr>
                              <td class="kg-cta-image-container" width="64">
                                <a href="http://blog.com/post1"><img
                                    src="http://blog.com/image1.jpg"
                                    alt="CTA Image"
                                    class="kg-cta-image"
                                    width="64"
                                    height="64" /></a>
                              </td>
                              <td class="kg-cta-content-inner">
                                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                  <tbody>
                                    <tr>
                                      <td class="kg-cta-text">This is a cool advertisement</td>
                                    </tr>
                                    <tr>
                                      <td class="kg-cta-button-container">
                                        <table
                                          class="btn"
                                          border="0"
                                          cellspacing="0"
                                          cellpadding="0">
                                          <tbody>
                                            <tr>
                                              <td
                                                align="center"
                                                style="background-color: #000000">
                                                <a
                                                  href="http://blog.com/post1"
                                                  style="color: #ffffff !important">click me</a>
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

        it('has all data attributes', function () {
            const result = renderForEmail(getTestData({
                backgroundColor: 'green',
                buttonColor: '#F0F0F0',
                buttonText: 'Get access now',
                buttonTextColor: '#000000',
                buttonUrl: 'http://someblog.com/somepost',
                hasSponsorLabel: true,
                sponsorLabel: '<p><span style="white-space: pre-wrap;">SPONSORED</span></p>',
                imageUrl: '/content/images/2022/11/koenig-lexical.jpg',
                layout: 'immersive',
                showButton: true,
                showDividers: true,
                textValue: '<p><span style="white-space: pre-wrap;">This is a new CTA Card via email.</span></p>'
            }));

            assert(result.html.includes('kg-cta-bg-green'));
            assert(result.html.includes('background-color: #F0F0F0'));
            assert(result.html.includes('Get access now'));
            assert(result.html.includes('http://someblog.com/somepost'));
            assert(result.html.includes('<p><span style="white-space: pre-wrap;">SPONSORED</span></p>')); // because hasSponsorLabel is true
            assert(result.html.includes('/content/images/2022/11/koenig-lexical.jpg'));
            assert(result.html.includes('This is a new CTA Card via email.'));
        });

        it('uses cropped image when layout is minimal', function () {
            const result = renderForEmail(getTestData({imageUrl: '/content/images/2022/11/koenig-lexical.jpg', layout: 'minimal'}));

            assert(result.html.includes('width="64" height="64"'));
            // defaults to 256x256 for minimal layout
            assert(result.html.includes('src="/content/images/size/w256h256/2022/11/koenig-lexical.jpg"'));
        });

        it('uses configured email size if available', function () {
            const result = renderForEmail(
                getTestData({imageUrl: '/content/images/2022/11/koenig-lexical.jpg', layout: 'minimal'}),
                {feature: {}, imageOptimization: {internalImageSizes: {'email-cta-minimal-image': {width: 128, height: 128}}}}
            );

            assert(result.html.includes('width="64" height="64"'));
            assert(result.html.includes('src="/content/images/size/w128h128/2022/11/koenig-lexical.jpg"'));
        });

        it('uses original image and provided width and height for immersive layout', function () {
            const result = renderForEmail(getTestData({
                imageUrl: '/content/images/2022/11/koenig-lexical.jpg',
                layout: 'immersive',
                imageWidth: 200,
                imageHeight: 100
            }));

            assert(result.html.includes('width="200" height="100"'));
            assert(result.html.includes('src="/content/images/2022/11/koenig-lexical.jpg"'));
        });

        it('does not render image tag when imageUrl is not provided', function () {
            const result = renderForEmail(getTestData({imageUrl: null}));
            assert(!result.html.includes('<img'));
        });

        it('renders with visibility', function () {
            const result = renderForEmail(getTestData({
                visibility: {...visibility.buildDefaultVisibility(), email: {memberSegment: 'status:free'}}
            }));

            assert.equal(result.type, 'html');
            assert.equal(result.element.tagName, 'DIV');
            assert.equal(result.element.dataset.ghSegment, 'status:free');
        });

        LAYOUTS.forEach((layout) => {
            ['buttonUrl', 'buttonText'].forEach((key) => {
                it(`skips button render on missing ${key} (${layout})`, function () {
                    const result = renderForEmail(getTestData({layout, [key]: null}));
                    assert.equal(result.element.querySelector('.kg-cta-button'), null);
                });
            });
        });

        LAYOUTS.forEach((layout) => {
            it(`adds link to image when button is present with url (${layout})`, function () {
                const result = renderForEmail(getTestData({layout, buttonUrl: 'http://blog.com/post1'}));
                assert(result.html.includes('<a href="http://blog.com/post1"><img'));
            });
        });

        LAYOUTS.forEach((layout) => {
            it(`skips link to image when button is not present (${layout})`, function () {
                const result = renderForEmail(getTestData({layout, buttonUrl: null}));
                assert(!result.html.includes('<a href="http://blog.com/post1"><img'));
            });
        });

        it('handles accent button color', function () {
            const data = getTestData({buttonColor: 'accent'});
            const result = renderForEmail(data);

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
                buttonColor: 'black'
            });
            const result = renderForEmail(data, {
                design: {backgroundIsDark: false},
                feature: {}
            });

            assertPrettifiedIncludes(result.html, html`
                <table class="btn" border="0" cellspacing="0" cellpadding="0">
                    <tbody>
                        <tr>
                            <td align="center" style="background-color: black;">
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
                            <td align="center" style="background-color: black;">
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
