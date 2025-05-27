const assert = require('assert/strict');
const {callRenderer, html, assertPrettifiesTo, visibility} = require('../test-utils');

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
            buttonColor: 'none',
            buttonTextColor: 'none',
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
                                style="background-color: none; color: none"
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
                                                                <table border="0" cellpadding="0" cellspacing="0" class="kg-cta-button-wrapper">
                                                                    <tbody>
                                                                        <tr>
                                                                            <td class="" style="background-color: none; color: none">
                                                                                <a href="http://blog.com/post1" class="kg-cta-button" style="background-color: none; color: none">
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
    });

    describe('email (emailCustomization)', function () {
        it('matches snapshot for default test data', function () {
            const result = renderForEmail(getTestData(), {feature: {emailCustomization: true}});

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
                                                                <table border="0" cellpadding="0" cellspacing="0" class="btn">
                                                                    <tbody>
                                                                        <tr>
                                                                            <td class="" style="background-color: none; color: none">
                                                                                <a href="http://blog.com/post1" class="" style="background-color: none; color: none">
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
    });

    describe('email (emailCustomizationAlpha)', function () {
        it('matches snapshot for default test data', function () {
            const result = renderForEmail(getTestData(), {feature: {emailCustomizationAlpha: true}});

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
                                                                <table border="0" cellpadding="0" cellspacing="0" class="btn">
                                                                    <tbody>
                                                                        <tr>
                                                                            <td class="" style="background-color: none; color: none">
                                                                                <a href="http://blog.com/post1" class="" style="background-color: none; color: none">
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
    });
});
