const assert = require('node:assert/strict');
const {callRenderer, html, assertPrettifiesTo} = require('../test-utils');

describe('services/koenig/node-renderers/header-v1-renderer', function () {
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

    describe('email', function () {
        it('matches snapshot for default test data', function () {
            const result = renderForEmail(getTestData());

            assert.ok(result.html);

            assertPrettifiesTo(result.html, html`
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
