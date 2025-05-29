const assert = require('assert/strict');
const {callRenderer, html, assertPrettifiesTo} = require('../test-utils');

describe('services/koenig/node-renderers/header-v2-renderer', function () {
    function getTestData(overrides = {}) {
        return {
            version: 2,
            backgroundImageSrc: 'https://example.com/image.jpg',
            buttonEnabled: true,
            buttonText: 'The button',
            buttonUrl: 'https://example.com/',
            header: 'This is the header card',
            size: 'small',
            style: 'image',
            subheader: 'hello',
            // default values used for rendering
            alignment: 'center',
            backgroundColor: '#000000',
            backgroundImageWidth: null,
            backgroundImageHeight: null,
            backgroundSize: 'cover',
            textColor: '#FFFFFF',
            buttonColor: '#ffffff',
            buttonTextColor: '#000000',
            layout: 'full',
            swapped: false,
            accentColor: '#FF1A75',
            ...overrides
        };
    }

    function renderForWeb(data, options) {
        return callRenderer('header', data, options);
    }

    function renderForEmail(data, options) {
        return callRenderer('header', data, {...options, target: 'email'});
    }

    describe('web', function () {
        it('matches snapshot for default test data', function () {
            const result = renderForWeb(getTestData());

            assert.ok(result.html);

            assertPrettifiesTo(result.html, html`
                <div
                    class="kg-card kg-header-card kg-v2 kg-width-full kg-content-wide"
                    data-background-color="#000000">
                    <picture><img
                            class="kg-header-card-image"
                            src="https://example.com/image.jpg"
                            loading="lazy"
                            alt="" /></picture>
                    <div class="kg-header-card-content">
                        <div class="kg-header-card-text kg-align-center">
                            <h2
                                id="this-is-the-header-card"
                                class="kg-header-card-heading"
                                style="color: #ffffff"
                                data-text-color="#FFFFFF">
                                This is the header card
                            </h2>
                            <p
                            id="hello"
                            class="kg-header-card-subheading"
                            style="color: #ffffff"
                            data-text-color="#FFFFFF">
                                hello
                            </p>
                            <a
                            href="https://example.com/"
                            class="kg-header-card-button"
                            style="background-color: #ffffff; color: #000000"
                            data-button-color="#ffffff"
                            data-button-text-color="#000000">The button</a>
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
                <div
                    class="kg-header-card kg-v2"
                    style="
                    color: #ffffff;
                    text-align: center;
                    background-image: url(https://example.com/image.jpg);
                    background-size: cover;
                    background-position: center center;
                ">
                    <div class="kg-header-card-content" style="">
                        <h2 class="kg-header-card-heading" style="color: #ffffff">
                            This is the header card
                        </h2>
                        <p class="kg-header-card-subheading" style="color: #ffffff">hello</p>
                        <a
                        class="kg-header-card-button"
                        href="https://example.com/"
                        style="color: #000000; background-color: #ffffff; #ffffff">The button</a>
                    </div>
                </div>
            `);
        });
    });

    describe('email (emailCustomization)', function () {
        it('matches snapshot for default test data', function () {
            const result = renderForEmail(getTestData(), {feature: {emailCustomization: true}});

            assert.ok(result.html);

            assertPrettifiesTo(result.html, html`
                <div
                    class="kg-header-card kg-v2"
                    style="
                        color: #ffffff;
                        text-align: center;
                        background-image: url(https://example.com/image.jpg);
                        background-size: cover;
                        background-position: center center;
                ">
                    <table
                        border="0"
                        cellpadding="0"
                        cellspacing="0"
                        width="100%"
                        style="
                            color: #ffffff;
                            text-align: center;
                            background-image: url(https://example.com/image.jpg);
                            background-size: cover;
                            background-position: center center;
                    ">
                        <tbody>
                            <tr>
                                <td class="kg-header-card-content" style="">
                                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                        <tbody>
                                            <tr>
                                                <td align="center">
                                                    <h2 class="kg-header-card-heading" style="color: #ffffff">
                                                        This is the header card
                                                    </h2>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td class="kg-header-card-subheading-wrapper" align="center">
                                                    <p class="kg-header-card-subheading" style="color: #ffffff">
                                                        hello
                                                    </p>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td class="kg-header-button-wrapper">
                                                    <table
                                                        class="btn"
                                                        border="0"
                                                        cellspacing="0"
                                                        cellpadding="0"
                                                        align="center">
                                                        <tbody>
                                                            <tr>
                                                                <td
                                                                    align="center"
                                                                    style="background-color: #ffffff; #ffffff">
                                                                    <a href="https://example.com/" style="color: #000000">The button</a>
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
                </div>
            `);
        });
    });

    describe('email (emailCustomizationAlpha)', function () {
        it('matches snapshot for default test data', function () {
            const result = renderForEmail(getTestData(), {feature: {emailCustomizationAlpha: true}});

            assert.ok(result.html);

            assertPrettifiesTo(result.html, html`
                <div
                    class="kg-header-card kg-v2"
                    style="
                        color: #ffffff;
                        text-align: center;
                        background-image: url(https://example.com/image.jpg);
                        background-size: cover;
                        background-position: center center;
                ">
                    <table
                        border="0"
                        cellpadding="0"
                        cellspacing="0"
                        width="100%"
                        style="
                            color: #ffffff;
                            text-align: center;
                            background-image: url(https://example.com/image.jpg);
                            background-size: cover;
                            background-position: center center;
                    ">
                        <tbody>
                            <tr>
                                <td class="kg-header-card-content" style="">
                                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                        <tbody>
                                            <tr>
                                                <td align="center">
                                                    <h2 class="kg-header-card-heading" style="color: #ffffff">
                                                        This is the header card
                                                    </h2>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td class="kg-header-card-subheading-wrapper" align="center">
                                                    <p class="kg-header-card-subheading" style="color: #ffffff">
                                                        hello
                                                    </p>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td class="kg-header-button-wrapper">
                                                    <table
                                                        class="btn"
                                                        border="0"
                                                        cellspacing="0"
                                                        cellpadding="0"
                                                        align="center">
                                                        <tbody>
                                                            <tr>
                                                                <td
                                                                    align="center"
                                                                    style="background-color: #ffffff; #ffffff">
                                                                    <a href="https://example.com/" style="color: #000000">The button</a>
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
                </div>
            `);
        });
    });
});
