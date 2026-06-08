const assert = require('node:assert/strict');
const {callRenderer, html, assertPrettifiesTo} = require('../test-utils');

describe('services/koenig/node-renderers/gallery-renderer', function () {
    function getTestData(overrides = {}) {
        return {
            images: [
                {
                    row: 0,
                    fileName: 'NatGeo01.jpg',
                    src: '/content/images/2018/08/NatGeo01-9.jpg',
                    width: 3200,
                    height: 1600
                },
                {
                    row: 0,
                    fileName: 'NatGeo02.jpg',
                    src: '/content/images/2018/08/NatGeo02-10.jpg',
                    width: 3200,
                    height: 1600
                },
                {
                    row: 0,
                    fileName: 'NatGeo03.jpg',
                    src: '/content/images/2018/08/NatGeo03-6.jpg',
                    width: 3200,
                    height: 1600
                },
                {
                    row: 1,
                    fileName: 'NatGeo04.jpg',
                    src: '/content/images/2018/08/NatGeo04-7.jpg',
                    alt: 'Alt test',
                    width: 3200,
                    height: 1600
                },
                {
                    row: 1,
                    fileName: 'NatGeo05.jpg',
                    src: '/content/images/2018/08/NatGeo05-4.jpg',
                    title: 'Title test',
                    width: 3200,
                    height: 1600
                },
                {
                    row: 1,
                    fileName: 'NatGeo06.jpg',
                    src: '/content/images/2018/08/NatGeo06-6.jpg',
                    width: 3200,
                    height: 1600
                },
                {
                    row: 2,
                    fileName: 'NatGeo07.jpg',
                    src: '/content/images/2018/08/NatGeo07-5.jpg',
                    width: 3200,
                    height: 1600
                },
                {
                    row: 2,
                    fileName: 'NatGeo09.jpg',
                    src: '/content/images/2018/08/NatGeo09-8.jpg',
                    width: 3200,
                    height: 1600,
                    href: 'https://example.com'
                }
            ],
            caption: 'Test caption',
            ...overrides
        };
    }

    function renderForWeb(data, options) {
        return callRenderer('gallery', data, options);
    }

    function renderForEmail(data, options) {
        return callRenderer('gallery', data, {...options, target: 'email'});
    }

    describe('web', function () {
        it('matches snapshot for default test data', function () {
            const result = renderForWeb(getTestData());

            assert.ok(result.html);

            assertPrettifiesTo(result.html, html`
                <figure class="kg-card kg-gallery-card kg-width-wide kg-card-hascaption">
                    <div class="kg-gallery-container">
                        <div class="kg-gallery-row">
                        <div class="kg-gallery-image">
                            <img src="/content/images/2018/08/NatGeo01-9.jpg" width="3200" height="1600" loading="lazy" alt="" srcset="
                                /content/images/size/w600/2018/08/NatGeo01-9.jpg   600w,
                                /content/images/size/w1000/2018/08/NatGeo01-9.jpg 1000w,
                                /content/images/size/w1600/2018/08/NatGeo01-9.jpg 1600w,
                                /content/images/size/w2400/2018/08/NatGeo01-9.jpg 2400w
                            " sizes="(min-width: 720px) 720px" />
                        </div>
                        <div class="kg-gallery-image">
                            <img src="/content/images/2018/08/NatGeo02-10.jpg" width="3200" height="1600" loading="lazy" alt="" srcset="
                                /content/images/size/w600/2018/08/NatGeo02-10.jpg   600w,
                                /content/images/size/w1000/2018/08/NatGeo02-10.jpg 1000w,
                                /content/images/size/w1600/2018/08/NatGeo02-10.jpg 1600w,
                                /content/images/size/w2400/2018/08/NatGeo02-10.jpg 2400w
                            " sizes="(min-width: 720px) 720px" />
                        </div>
                        <div class="kg-gallery-image">
                            <img src="/content/images/2018/08/NatGeo03-6.jpg" width="3200" height="1600" loading="lazy" alt="" srcset="
                                /content/images/size/w600/2018/08/NatGeo03-6.jpg   600w,
                                /content/images/size/w1000/2018/08/NatGeo03-6.jpg 1000w,
                                /content/images/size/w1600/2018/08/NatGeo03-6.jpg 1600w,
                                /content/images/size/w2400/2018/08/NatGeo03-6.jpg 2400w
                            " sizes="(min-width: 720px) 720px" />
                        </div>
                        </div>
                        <div class="kg-gallery-row">
                        <div class="kg-gallery-image">
                            <img src="/content/images/2018/08/NatGeo04-7.jpg" width="3200" height="1600" loading="lazy" alt="Alt test"
                            srcset="
                                /content/images/size/w600/2018/08/NatGeo04-7.jpg   600w,
                                /content/images/size/w1000/2018/08/NatGeo04-7.jpg 1000w,
                                /content/images/size/w1600/2018/08/NatGeo04-7.jpg 1600w,
                                /content/images/size/w2400/2018/08/NatGeo04-7.jpg 2400w
                            " sizes="(min-width: 720px) 720px" />
                        </div>
                        <div class="kg-gallery-image">
                            <img src="/content/images/2018/08/NatGeo05-4.jpg" width="3200" height="1600" loading="lazy" alt=""
                            title="Title test" srcset="
                                /content/images/size/w600/2018/08/NatGeo05-4.jpg   600w,
                                /content/images/size/w1000/2018/08/NatGeo05-4.jpg 1000w,
                                /content/images/size/w1600/2018/08/NatGeo05-4.jpg 1600w,
                                /content/images/size/w2400/2018/08/NatGeo05-4.jpg 2400w
                            " sizes="(min-width: 720px) 720px" />
                        </div>
                        <div class="kg-gallery-image">
                            <img src="/content/images/2018/08/NatGeo06-6.jpg" width="3200" height="1600" loading="lazy" alt="" srcset="
                                /content/images/size/w600/2018/08/NatGeo06-6.jpg   600w,
                                /content/images/size/w1000/2018/08/NatGeo06-6.jpg 1000w,
                                /content/images/size/w1600/2018/08/NatGeo06-6.jpg 1600w,
                                /content/images/size/w2400/2018/08/NatGeo06-6.jpg 2400w
                            " sizes="(min-width: 720px) 720px" />
                        </div>
                        </div>
                        <div class="kg-gallery-row">
                        <div class="kg-gallery-image">
                            <img src="/content/images/2018/08/NatGeo07-5.jpg" width="3200" height="1600" loading="lazy" alt="" srcset="
                                /content/images/size/w600/2018/08/NatGeo07-5.jpg   600w,
                                /content/images/size/w1000/2018/08/NatGeo07-5.jpg 1000w,
                                /content/images/size/w1600/2018/08/NatGeo07-5.jpg 1600w,
                                /content/images/size/w2400/2018/08/NatGeo07-5.jpg 2400w
                            " sizes="(min-width: 720px) 720px" />
                        </div>
                        <div class="kg-gallery-image">
                            <a href="https://example.com"><img src="/content/images/2018/08/NatGeo09-8.jpg" width="3200" height="1600"
                                loading="lazy" alt="" srcset="
                                /content/images/size/w600/2018/08/NatGeo09-8.jpg   600w,
                                /content/images/size/w1000/2018/08/NatGeo09-8.jpg 1000w,
                                /content/images/size/w1600/2018/08/NatGeo09-8.jpg 1600w,
                                /content/images/size/w2400/2018/08/NatGeo09-8.jpg 2400w
                                " sizes="(min-width: 720px) 720px" /></a>
                        </div>
                        </div>
                    </div>
                    <figcaption>Test caption</figcaption>
                    </figure>
            `);
        });

        it('renders nothing with empty images array', function () {
            const result = renderForWeb(getTestData({images: []}));
            assert.equal(result.html, '');
        });

        it('generates srcset for CDN gallery images when imageBaseUrl is configured', function () {
            const cdnUrl = 'https://cdn.example.com/c/uuid';
            const result = renderForWeb(getTestData({
                images: [
                    {
                        row: 0,
                        fileName: 'NatGeo01.jpg',
                        src: `${cdnUrl}/content/images/2018/08/NatGeo01-9.jpg`,
                        width: 3200,
                        height: 1600
                    }
                ],
                caption: ''
            }), {imageBaseUrl: cdnUrl});

            assert.ok(result.html);
            assert.ok(result.html.includes(`${cdnUrl}/content/images/size/w600/2018/08/NatGeo01-9.jpg`));
            assert.ok(result.html.includes('srcset'));
        });

        it('does not generate srcset for CDN gallery images when imageBaseUrl is not configured', function () {
            const cdnUrl = 'https://cdn.example.com/c/uuid';
            const result = renderForWeb(getTestData({
                images: [
                    {
                        row: 0,
                        fileName: 'NatGeo01.jpg',
                        src: `${cdnUrl}/content/images/2018/08/NatGeo01-9.jpg`,
                        width: 3200,
                        height: 1600
                    }
                ],
                caption: ''
            }));

            assert.ok(result.html);
            assert.ok(!result.html.includes('srcset'));
        });
    });

    describe('email', function () {
        it('matches snapshot for default test data', function () {
            const result = renderForEmail(getTestData());

            assert.ok(result.html);

            assertPrettifiesTo(result.html, html`
                <figure class="kg-card kg-gallery-card kg-width-wide kg-card-hascaption">
                    <div class="kg-gallery-container">
                        <div class="kg-gallery-row">
                            <div class="kg-gallery-image">
                                <img src="/content/images/size/w1600/2018/08/NatGeo01-9.jpg" width="600" height="300" loading="lazy" alt="" />
                            </div>
                            <div class="kg-gallery-image">
                                <img src="/content/images/size/w1600/2018/08/NatGeo02-10.jpg" width="600" height="300" loading="lazy" alt="" />
                            </div>
                            <div class="kg-gallery-image">
                                <img src="/content/images/size/w1600/2018/08/NatGeo03-6.jpg" width="600" height="300" loading="lazy" alt="" />
                            </div>
                        </div>
                        <div class="kg-gallery-row">
                            <div class="kg-gallery-image">
                                <img src="/content/images/size/w1600/2018/08/NatGeo04-7.jpg" width="600" height="300" loading="lazy" alt="Alt test" />
                            </div>
                            <div class="kg-gallery-image">
                                <img src="/content/images/size/w1600/2018/08/NatGeo05-4.jpg" width="600" height="300" loading="lazy" alt="" title="Title test" />
                            </div>
                            <div class="kg-gallery-image">
                                <img src="/content/images/size/w1600/2018/08/NatGeo06-6.jpg" width="600" height="300" loading="lazy" alt="" />
                            </div>
                        </div>
                        <div class="kg-gallery-row">
                            <div class="kg-gallery-image">
                                <img src="/content/images/size/w1600/2018/08/NatGeo07-5.jpg" width="600" height="300" loading="lazy" alt="" />
                            </div>
                            <div class="kg-gallery-image">
                                <a href="https://example.com"><img src="/content/images/size/w1600/2018/08/NatGeo09-8.jpg" width="600" height="300" loading="lazy" alt="" /></a>
                            </div>
                        </div>
                    </div>
                    <figcaption>Test caption</figcaption>
                </figure>
            `);
        });

        it('renders nothing with empty images array', function () {
            const result = renderForEmail(getTestData({images: []}));
            assert.equal(result.html, '');
        });
    });
});
