const assert = require('assert/strict');
const {callRenderer, html, assertPrettifiesTo} = require('../test-utils');

describe('services/koenig/node-renderers/image-renderer', function () {
    function getTestData(overrides = {}) {
        return {
            src: '/content/images/2022/11/koenig-lexical.jpg',
            width: 3840,
            height: 2160,
            href: '',
            title: 'This is a title',
            alt: 'This is some alt text',
            caption: 'This is a <b>caption</b>',
            ...overrides
        };
    }

    function getExportOptions() {
        return {
            imageOptimization: {
                contentImageSizes: {
                    w600: {width: 600},
                    w1000: {width: 1000},
                    w1600: {width: 1600},
                    w2400: {width: 2400}
                }
            },
            canTransformImage: () => true
        };
    }

    function renderForWeb(data, options) {
        return callRenderer('image', data, {...getExportOptions(), ...options});
    }

    function renderForEmail(data, options) {
        return callRenderer('image', data, {...getExportOptions(), ...options, target: 'email'});
    }

    describe('web', function () {
        it('matches snapshot for default test data', function () {
            const result = renderForWeb(getTestData());

            assert.ok(result.html);

            assertPrettifiesTo(result.html, html`
                <figure class="kg-card kg-image-card kg-width-undefined kg-card-hascaption">
                    <img
                        src="/content/images/2022/11/koenig-lexical.jpg"
                        class="kg-image"
                        alt="This is some alt text"
                        loading="lazy"
                        title="This is a title"
                        width="3840"
                        height="2160"
                        srcset="
                            /content/images/size/w600/2022/11/koenig-lexical.jpg   600w,
                            /content/images/size/w1000/2022/11/koenig-lexical.jpg 1000w,
                            /content/images/size/w1600/2022/11/koenig-lexical.jpg 1600w,
                            /content/images/size/w2400/2022/11/koenig-lexical.jpg 2400w
                        "
                        sizes="(min-width: 720px) 720px" />
                    <figcaption>This is a<b>caption</b></figcaption>
                </figure>
            `);
        });

        it('renders with href', function () {
            const result = renderForWeb(getTestData({href: 'https://example.com'}));
            assert.ok(result.html.includes('<a href="https://example.com"'));
        });
    });

    describe('email', function () {
        it('matches snapshot for default test data', function () {
            const result = renderForEmail(getTestData());

            assert.ok(result.html);

            assertPrettifiesTo(result.html, html`
                <figure class="kg-card kg-image-card kg-width-undefined kg-card-hascaption">
                    <img
                        src="/content/images/size/w1600/2022/11/koenig-lexical.jpg"
                        class="kg-image"
                        alt="This is some alt text"
                        loading="lazy"
                        title="This is a title"
                        width="600"
                        height="338" />
                    <figcaption>This is a<b>caption</b></figcaption>
                </figure>
            `);
        });

        it('renders with href', function () {
            const result = renderForEmail(getTestData({href: 'https://example.com'}));
            assert.ok(result.html.includes('<a href="https://example.com"'));
        });
    });
});
