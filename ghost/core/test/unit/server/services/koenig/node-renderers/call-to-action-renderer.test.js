const assert = require('node:assert/strict');
const {callRenderer, html, assertPrettifiesTo, assertPrettifiedIncludes, visibility} = require('../test-utils');

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
