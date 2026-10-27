import assert from 'node:assert/strict';
import {assertPrettifiesTo, callRenderer, html} from '../test-utils/index.js';

describe('renderers/header-v1-renderer', function () {
    function getTestData(overrides = {}) {
        return {
            version: 1,
            backgroundImageSrc: 'https://example.com/image.jpg',
            buttonEnabled: true,
            buttonText: 'The button',
            buttonUrl: 'https://example.com/',
            header: 'This is the header card',
            size: 'small',
            style: 'image',
            subheader: 'hello',
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
        it('matches snapshot for default test data', async function () {
            const result = renderForWeb(getTestData());

            assert.ok(result.html);

            await assertPrettifiesTo(result.html, html`
                <div
                    class="kg-card kg-header-card kg-width-full kg-size-small kg-style-image"
                    data-kg-background-image="https://example.com/image.jpg"
                    style="background-image: url(https://example.com/image.jpg)">
                    <h2 class="kg-header-card-header" id="this-is-the-header-card">
                        This is the header card
                    </h2>
                    <h3 class="kg-header-card-subheader" id="hello">hello</h3>
                    <a class="kg-header-card-button" href="https://example.com/">The button</a>
                </div>
            `);
        });

        it('renders nothing when header and subheader is undefined and the button is disabled', function () {
            const result = renderForWeb(getTestData({header: null, subheader: null, buttonEnabled: false}));

            assert.equal(result.type, 'inner');
            assert.equal(result.html, '');
        });

        it('renders a minimal header card', async function () {
            const result = renderForWeb(getTestData({
                backgroundImageSrc: '',
                buttonEnabled: false,
                header: 'hello world',
                style: 'dark',
                subheader: 'hello sub world'
            }));

            await assertPrettifiesTo(result.html, html`
                <div class="kg-card kg-header-card kg-width-full kg-size-small kg-style-dark" data-kg-background-image="" style="">
                    <h2 class="kg-header-card-header" id="hello-world">hello world</h2>
                    <h3 class="kg-header-card-subheader" id="hello-sub-world">hello sub world</h3>
                </div>
            `);
        });

        it('renders without subheader', async function () {
            const result = renderForWeb(getTestData({
                backgroundImageSrc: '',
                buttonEnabled: false,
                header: 'hello world',
                style: 'dark',
                subheader: ''
            }));

            await assertPrettifiesTo(result.html, html`
                <div class="kg-card kg-header-card kg-width-full kg-size-small kg-style-dark" data-kg-background-image="" style="">
                    <h2 class="kg-header-card-header" id="hello-world">hello world</h2>
                </div>
            `);
        });

        it('renders without subheader when it only contains trailing BR variants', async function () {
            const result = renderForWeb(getTestData({
                backgroundImageSrc: '',
                buttonEnabled: false,
                header: 'hello world',
                style: 'dark',
                subheader: '<BR /><br/>'
            }));

            await assertPrettifiesTo(result.html, html`
                <div class="kg-card kg-header-card kg-width-full kg-size-small kg-style-dark" data-kg-background-image="" style="">
                    <h2 class="kg-header-card-header" id="hello-world">hello world</h2>
                </div>
            `);
        });
    });

    describe('email', function () {
        it('matches snapshot for default test data', async function () {
            const result = renderForEmail(getTestData());

            assert.ok(result.html);

            await assertPrettifiesTo(result.html, html`
                <div
                    class="kg-card kg-header-card kg-width-full kg-size-small kg-style-image"
                    data-kg-background-image="https://example.com/image.jpg"
                    style="background-image: url(https://example.com/image.jpg)">
                    <h2 class="kg-header-card-header" id="this-is-the-header-card">
                        This is the header card
                    </h2>
                    <h3 class="kg-header-card-subheader" id="hello">hello</h3>
                    <a class="kg-header-card-button" href="https://example.com/">The button</a>
                </div>
            `);
        });
    });
});
