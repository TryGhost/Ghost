import assert from 'node:assert/strict';
import {assertPrettifiedIncludes, assertPrettifiesTo, callRenderer, html} from '../test-utils/index.js';

describe('renderers/header-v2-renderer', function () {
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

    function renderForWeb(data: Record<string, unknown>, options?: Record<string, unknown>) {
        return callRenderer('header', data, options);
    }

    function renderForEmail(data: Record<string, unknown>, options?: Record<string, unknown>) {
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

        it('renders empty card when header and subheader is undefined and the button is disabled', function () {
            const result = renderForWeb(getTestData({header: null, subheader: null, buttonEnabled: false}));

            // v2 renderer has no empty check — it always returns a card element
            assert.ok(result.element);
            assert.equal(result.element.querySelector('.kg-header-card-heading'), null);
            assert.equal(result.element.querySelector('.kg-header-card-subheading'), null);
            assert.equal(result.element.querySelector('.kg-header-card-button'), null);
        });

        it('renders without subheader', function () {
            const result = renderForWeb(getTestData({
                backgroundImageSrc: '',
                buttonEnabled: false,
                header: 'hello world',
                subheader: ''
            }));

            assertPrettifiesTo(result.html, html`
                <div
                    class="kg-card kg-header-card kg-v2 kg-width-full kg-content-wide"
                    style="background-color: #000000"
                    data-background-color="#000000">
                    <div class="kg-header-card-content">
                        <div class="kg-header-card-text kg-align-center">
                            <h2
                                id="hello-world"
                                class="kg-header-card-heading"
                                style="color: #ffffff"
                                data-text-color="#FFFFFF">
                                hello world
                            </h2>
                        </div>
                    </div>
                </div>
            `);
        });

        it('renders with srcset', function () {
            const result = renderForWeb(getTestData({
                backgroundImageSrc: '/content/images/2022/11/koenig-lexical.jpg',
                backgroundImageWidth: 3840,
                backgroundImageHeight: 2160,
                buttonEnabled: false,
                header: 'hello world',
                subheader: ''
            }));

            assertPrettifiesTo(result.html, html`
                <div
                    class="kg-card kg-header-card kg-v2 kg-width-full kg-content-wide"
                    data-background-color="#000000">
                    <picture><img
                            class="kg-header-card-image"
                            src="/content/images/2022/11/koenig-lexical.jpg"
                            srcset="/content/images/size/w600/2022/11/koenig-lexical.jpg 600w, /content/images/size/w1000/2022/11/koenig-lexical.jpg 1000w, /content/images/size/w1600/2022/11/koenig-lexical.jpg 1600w, /content/images/size/w2400/2022/11/koenig-lexical.jpg 2400w"
                            loading="lazy"
                            alt="" /></picture>
                    <div class="kg-header-card-content">
                        <div class="kg-header-card-text kg-align-center">
                            <h2
                                id="hello-world"
                                class="kg-header-card-heading"
                                style="color: #ffffff"
                                data-text-color="#FFFFFF">
                                hello world
                            </h2>
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
                <div
                    class="kg-header-card kg-v2 kg-header-card-dark-bg"
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
                                <!--[if mso]>
                        <td class="kg-header-card-content" style="padding: 0;">
                    <![endif]-->
                                <!--[if !mso]><!-->
                                <td class="kg-header-card-content" style="">
                                <!--<![endif]-->
                                    <!--[if mso]>
                        <v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:600px;">
                            <v:fill src="https://example.com/image.jpg" color="#000000" type="frame" aspect="atleast" focusposition="0.5,0.5" />
                            <v:textbox inset="30pt,30pt,30pt,30pt" style="mso-fit-shape-to-text:true;">
                    <![endif]-->
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
                                                                    style="background-color: #ffffff;">
                                                                    <a href="https://example.com/" style="color: #000000 !important;">The button</a>
                                                                </td>
                                                            </tr>
                                                        </tbody>
                                                    </table>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                <!--[if mso]>
            </v:textbox>
        </v:rect>
        <![endif]-->
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            `);
        });

        it('has expected button output for outline buttons', function () {
            const result = renderForEmail(getTestData(), {design: {buttonStyle: 'outline'}, feature: {}});

            assertPrettifiedIncludes(result.html, html`
                <td align="center" style="color: #ffffff !important; border: 1px solid #ffffff; border-color: currentColor; background-color: transparent;">
                    <a href="https://example.com/" style="color: #ffffff !important">The button</a>
                </td>
            `);
        });
    });
});
