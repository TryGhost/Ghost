import assert from 'node:assert/strict';
import {assertPrettifiesTo, callRenderer, html} from '../test-utils/index.js';

describe('renderers/gallery-renderer', function () {
    const contentImageSizes = {
        w600: {width: 600},
        w1000: {width: 1000},
        w1600: {width: 1600},
        w2400: {width: 2400}
    };

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

    function renderForWeb(data: Record<string, unknown>, options?: Record<string, unknown>) {
        return callRenderer('gallery', data, options);
    }

    function renderForEmail(data: Record<string, unknown>, options?: Record<string, unknown>) {
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

        it('renders nothing when no images are valid', function () {
            const result = renderForWeb({images: [{src: 'undefined'}], caption: null});
            assert.equal(result.html, '');
        });

        it('skips invalid images', function () {
            const result = renderForWeb({
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
                        src: '/content/images/2018/08/NatGeo02-10.jpg'
                    },
                    null,
                    7,
                    {
                        row: 0,
                        fileName: 'NatGeoBad.jpg',
                        src: '/content/images/2018/08/NatGeoBad.jpg',
                        width: '3200',
                        height: 1600
                    },
                    {
                        row: '0',
                        fileName: 'NatGeoRowBad.jpg',
                        src: '/content/images/2018/08/NatGeoRowBad.jpg',
                        width: 3200,
                        height: 1600
                    },
                    {
                        row: -1,
                        fileName: 'NatGeoNegativeRow.jpg',
                        src: '/content/images/2018/08/NatGeoNegativeRow.jpg',
                        width: 3200,
                        height: 1600
                    },
                    {
                        row: 0.5,
                        fileName: 'NatGeoFractionalRow.jpg',
                        src: '/content/images/2018/08/NatGeoFractionalRow.jpg',
                        width: 3200,
                        height: 1600
                    },
                    {
                        row: 0,
                        fileName: 'NatGeoZeroWidth.jpg',
                        src: '/content/images/2018/08/NatGeoZeroWidth.jpg',
                        width: 0,
                        height: 1600
                    },
                    {
                        row: 0,
                        fileName: 'NatGeoZeroHeight.jpg',
                        src: '/content/images/2018/08/NatGeoZeroHeight.jpg',
                        width: 3200,
                        height: 0
                    },
                    {
                        row: 0,
                        fileName: 'NatGeo03.jpg',
                        src: '/content/images/2018/08/NatGeo03-6.jpg',
                        width: 3200,
                        height: 1600
                    }
                ],
                caption: 'Test caption'
            }, {canTransformImage: () => false});

            assertPrettifiesTo(result.html, html`
                <figure class="kg-card kg-gallery-card kg-width-wide kg-card-hascaption">
                    <div class="kg-gallery-container">
                        <div class="kg-gallery-row">
                            <div class="kg-gallery-image"><img src="/content/images/2018/08/NatGeo01-9.jpg" width="3200" height="1600" loading="lazy" alt="" /></div>
                            <div class="kg-gallery-image"><img src="/content/images/2018/08/NatGeo03-6.jpg" width="3200" height="1600" loading="lazy" alt="" /></div>
                        </div>
                    </div>
                    <figcaption>Test caption</figcaption>
                </figure>
            `);
        });

        it('outputs width/height matching default max image width', function () {
            const result = renderForWeb({
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
                        fileName: 'photo-1591672299888-e16a08b6c7ce',
                        src: 'https://images.unsplash.com/photo-1591672299888-e16a08b6c7ce?ixlib=rb-1.2.1&q=80&fm=jpg&crop=entropy&cs=tinysrgb&w=2000&fit=max&ixid=eyJhcHBfaWQiOjExNzczfQ',
                        width: 2500,
                        height: 1800
                    }
                ],
                caption: ''
            }, {imageOptimization: {defaultMaxWidth: 2000, contentImageSizes}});

            // local is resized
            assert.match(result.html, /width="2000"/);
            assert.match(result.html, /height="1000"/);
            assert.doesNotMatch(result.html, /width="3200"/);
            assert.doesNotMatch(result.html, /height="1600"/);

            // unsplash is not
            assert.match(result.html, /width="2500"/);
            assert.match(result.html, /height="1800"/);
        });

        it('renders all 9 images in a 3x3 grid', function () {
            const result = renderForWeb({
                images: [
                    {
                        row: 0,
                        src: '/content/images/2018/08/NatGeo01-1.jpg',
                        width: 3200,
                        height: 1600,
                        fileName: 'NatGeo01-1.jpg'
                    },
                    {
                        row: 0,
                        src: '/content/images/2018/08/NatGeo01-2.jpg',
                        width: 3200,
                        height: 1600,
                        fileName: 'NatGeo01-2.jpg'
                    },
                    {
                        row: 0,
                        src: '/content/images/2018/08/NatGeo01-3.jpg',
                        width: 3200,
                        height: 1600,
                        fileName: 'NatGeo01-3.jpg'
                    },
                    {
                        row: 1,
                        src: '/content/images/2018/08/NatGeo01-4.jpg',
                        width: 3200,
                        height: 1600,
                        fileName: 'NatGeo01-4.jpg'
                    },
                    {
                        row: 1,
                        src: '/content/images/2018/08/NatGeo01-5.jpg',
                        width: 3200,
                        height: 1600,
                        fileName: 'NatGeo01-5.jpg'
                    },
                    {
                        row: 1,
                        src: '/content/images/2018/08/NatGeo01-6.jpg',
                        width: 3200,
                        height: 1600,
                        fileName: 'NatGeo01-6.jpg'
                    },
                    {
                        row: 2,
                        src: '/content/images/2018/08/NatGeo01-7.jpg',
                        width: 3200,
                        height: 1600,
                        fileName: 'NatGeo01-7.jpg'
                    },
                    {
                        row: 2,
                        src: '/content/images/2018/08/NatGeo01-8.jpg',
                        width: 3200,
                        height: 1600,
                        fileName: 'NatGeo01-8.jpg'
                    },
                    {
                        row: 2,
                        src: '/content/images/2018/08/NatGeo01-9.jpg',
                        width: 3200,
                        height: 1600,
                        fileName: 'NatGeo01-9.jpg'
                    }
                ],
                caption: ''
            }, {imageOptimization: {defaultMaxWidth: 2000}});

            assertPrettifiesTo(result.html, html`
                <figure class="kg-card kg-gallery-card kg-width-wide">
                    <div class="kg-gallery-container">
                        <div class="kg-gallery-row">
                            <div class="kg-gallery-image"><img src="/content/images/2018/08/NatGeo01-1.jpg" width="2000" height="1000" loading="lazy" alt="" /></div>
                            <div class="kg-gallery-image"><img src="/content/images/2018/08/NatGeo01-2.jpg" width="2000" height="1000" loading="lazy" alt="" /></div>
                            <div class="kg-gallery-image"><img src="/content/images/2018/08/NatGeo01-3.jpg" width="2000" height="1000" loading="lazy" alt="" /></div>
                        </div>
                        <div class="kg-gallery-row">
                            <div class="kg-gallery-image"><img src="/content/images/2018/08/NatGeo01-4.jpg" width="2000" height="1000" loading="lazy" alt="" /></div>
                            <div class="kg-gallery-image"><img src="/content/images/2018/08/NatGeo01-5.jpg" width="2000" height="1000" loading="lazy" alt="" /></div>
                            <div class="kg-gallery-image"><img src="/content/images/2018/08/NatGeo01-6.jpg" width="2000" height="1000" loading="lazy" alt="" /></div>
                        </div>
                        <div class="kg-gallery-row">
                            <div class="kg-gallery-image"><img src="/content/images/2018/08/NatGeo01-7.jpg" width="2000" height="1000" loading="lazy" alt="" /></div>
                            <div class="kg-gallery-image"><img src="/content/images/2018/08/NatGeo01-8.jpg" width="2000" height="1000" loading="lazy" alt="" /></div>
                            <div class="kg-gallery-image"><img src="/content/images/2018/08/NatGeo01-9.jpg" width="2000" height="1000" loading="lazy" alt="" /></div>
                        </div>
                    </div>
                </figure>
            `);
        });

        describe('srcset attribute', function () {
            it('is included when image src is relative or Unsplash', function () {
                const result = renderForWeb({
                    images: [{
                        row: 0,
                        fileName: 'NatGeo01.jpg',
                        src: '/content/images/2018/08/NatGeo01-9.jpg',
                        width: 3200,
                        height: 1600
                    }, {
                        row: 0,
                        fileName: 'NatGeo02.jpg',
                        src: '/subdir/support/content/images/2018/08/NatGeo01-9.jpg',
                        width: 3200,
                        height: 1600
                    }, {
                        row: 0,
                        fileName: 'photo-1591672299888-e16a08b6c7ce',
                        src: 'https://images.unsplash.com/photo-1591672299888-e16a08b6c7ce?ixlib=rb-1.2.1&q=80&fm=jpg&crop=entropy&cs=tinysrgb&w=2000&fit=max&ixid=eyJhcHBfaWQiOjExNzczfQ',
                        width: 2000,
                        height: 1600
                    }],
                    caption: ''
                });

                assertPrettifiesTo(result.html, html`
                    <figure class="kg-card kg-gallery-card kg-width-wide">
                        <div class="kg-gallery-container">
                            <div class="kg-gallery-row">
                                <div class="kg-gallery-image"><img src="/content/images/2018/08/NatGeo01-9.jpg" width="3200" height="1600" loading="lazy" alt="" srcset="/content/images/size/w600/2018/08/NatGeo01-9.jpg 600w, /content/images/size/w1000/2018/08/NatGeo01-9.jpg 1000w, /content/images/size/w1600/2018/08/NatGeo01-9.jpg 1600w, /content/images/size/w2400/2018/08/NatGeo01-9.jpg 2400w" sizes="(min-width: 720px) 720px" /></div>
                                <div class="kg-gallery-image"><img src="/subdir/support/content/images/2018/08/NatGeo01-9.jpg" width="3200" height="1600" loading="lazy" alt="" srcset="/subdir/support/content/images/size/w600/2018/08/NatGeo01-9.jpg 600w, /subdir/support/content/images/size/w1000/2018/08/NatGeo01-9.jpg 1000w, /subdir/support/content/images/size/w1600/2018/08/NatGeo01-9.jpg 1600w, /subdir/support/content/images/size/w2400/2018/08/NatGeo01-9.jpg 2400w" sizes="(min-width: 720px) 720px" /></div>
                                <div class="kg-gallery-image"><img src="https://images.unsplash.com/photo-1591672299888-e16a08b6c7ce?ixlib=rb-1.2.1&amp;q=80&amp;fm=jpg&amp;crop=entropy&amp;cs=tinysrgb&amp;w=2000&amp;fit=max&amp;ixid=eyJhcHBfaWQiOjExNzczfQ" width="2000" height="1600" loading="lazy" alt="" srcset="https://images.unsplash.com/photo-1591672299888-e16a08b6c7ce?ixlib=rb-1.2.1&amp;q=80&amp;fm=jpg&amp;crop=entropy&amp;cs=tinysrgb&amp;w=600&amp;fit=max&amp;ixid=eyJhcHBfaWQiOjExNzczfQ 600w, https://images.unsplash.com/photo-1591672299888-e16a08b6c7ce?ixlib=rb-1.2.1&amp;q=80&amp;fm=jpg&amp;crop=entropy&amp;cs=tinysrgb&amp;w=1000&amp;fit=max&amp;ixid=eyJhcHBfaWQiOjExNzczfQ 1000w, https://images.unsplash.com/photo-1591672299888-e16a08b6c7ce?ixlib=rb-1.2.1&amp;q=80&amp;fm=jpg&amp;crop=entropy&amp;cs=tinysrgb&amp;w=1600&amp;fit=max&amp;ixid=eyJhcHBfaWQiOjExNzczfQ 1600w, https://images.unsplash.com/photo-1591672299888-e16a08b6c7ce?ixlib=rb-1.2.1&amp;q=80&amp;fm=jpg&amp;crop=entropy&amp;cs=tinysrgb&amp;w=2000&amp;fit=max&amp;ixid=eyJhcHBfaWQiOjExNzczfQ 2000w" sizes="(min-width: 720px) 720px" /></div>
                            </div>
                        </div>
                    </figure>
                `);
            });

            it('is included when image src is absolute or __GHOST_URL__', function () {
                const result = renderForWeb({
                    images: [{
                        row: 0,
                        fileName: 'NatGeo01.jpg',
                        src: 'https://localhost:2368/content/images/2018/08/NatGeo01-9.jpg',
                        width: 3200,
                        height: 1600
                    }, {
                        row: 0,
                        fileName: 'NatGeo02.jpg',
                        src: '__GHOST_URL__/content/images/2018/08/NatGeo01-9.jpg',
                        width: 3200,
                        height: 1600
                    }],
                    caption: ''
                }, {siteUrl: 'https://localhost:2368'});

                assertPrettifiesTo(result.html, html`
                    <figure class="kg-card kg-gallery-card kg-width-wide">
                        <div class="kg-gallery-container">
                            <div class="kg-gallery-row">
                                <div class="kg-gallery-image"><img src="https://localhost:2368/content/images/2018/08/NatGeo01-9.jpg" width="3200" height="1600" loading="lazy" alt="" srcset="https://localhost:2368/content/images/size/w600/2018/08/NatGeo01-9.jpg 600w, https://localhost:2368/content/images/size/w1000/2018/08/NatGeo01-9.jpg 1000w, https://localhost:2368/content/images/size/w1600/2018/08/NatGeo01-9.jpg 1600w, https://localhost:2368/content/images/size/w2400/2018/08/NatGeo01-9.jpg 2400w" sizes="(min-width: 720px) 720px" /></div>
                                <div class="kg-gallery-image"><img src="__GHOST_URL__/content/images/2018/08/NatGeo01-9.jpg" width="3200" height="1600" loading="lazy" alt="" srcset="__GHOST_URL__/content/images/size/w600/2018/08/NatGeo01-9.jpg 600w, __GHOST_URL__/content/images/size/w1000/2018/08/NatGeo01-9.jpg 1000w, __GHOST_URL__/content/images/size/w1600/2018/08/NatGeo01-9.jpg 1600w, __GHOST_URL__/content/images/size/w2400/2018/08/NatGeo01-9.jpg 2400w" sizes="(min-width: 720px) 720px" /></div>
                            </div>
                        </div>
                    </figure>
                `);
            });

            it('is omitted when no contentImageSizes are passed as options', function () {
                const result = renderForWeb({
                    images: [{
                        row: 0,
                        fileName: 'NatGeo01.jpg',
                        src: '/content/images/2018/08/NatGeo01-9.jpg',
                        width: 3200,
                        height: 1600
                    }],
                    caption: ''
                }, {imageOptimization: {defaultMaxWidth: 2000}});

                assert.ok(!result.html.includes('srcset='));
            });

            it('is omitted when `srcsets: false` is passed as an options', function () {
                const result = renderForWeb({
                    images: [{
                        row: 0,
                        fileName: 'NatGeo01.jpg',
                        src: '/content/images/2018/08/NatGeo01-9.jpg',
                        width: 3200,
                        height: 1600
                    }],
                    caption: ''
                }, {imageOptimization: {defaultMaxWidth: 2000, contentImageSizes, srcsets: false}});

                assert.ok(!result.html.includes('srcset='));
            });
        });

        describe('sizes attribute', function () {
            it('is included for images over 720px', function () {
                const result = renderForWeb({
                    images: [{
                        row: 0,
                        fileName: 'standard.jpg',
                        src: '/content/images/2018/08/standard.jpg',
                        width: 720,
                        height: 1600
                    }, {
                        row: 0,
                        fileName: 'small.jpg',
                        src: '/subdir/support/content/images/2018/08/small.jpg',
                        width: 640,
                        height: 1600
                    }, {
                        row: 0,
                        fileName: 'photo',
                        src: 'https://images.unsplash.com/photo?w=2000',
                        width: 2000,
                        height: 1600
                    }],
                    caption: ''
                });

                const sizes = result.html.match(/sizes="(.*?)"/g);

                assert.equal(sizes!.length, 2);
                assert.match(result.html, /standard\.jpg 720w" sizes="\(min-width: 720px\) 720px"/);
                assert.match(result.html, /photo\?w=2000 2000w" sizes="\(min-width: 720px\) 720px"/);
            });

            it('uses "wide" media query for large single-image galleries', function () {
                const result = renderForWeb({
                    images: [{
                        row: 0,
                        fileName: 'standard.jpg',
                        src: '/content/images/2018/08/standard.jpg',
                        width: 2000,
                        height: 1600
                    }],
                    caption: ''
                });

                assert.match(result.html, /standard\.jpg 2000w" sizes="\(min-width: 1200px\) 1200px"/);
            });

            it('uses "standard" media query for medium single-image galleries', function () {
                const result = renderForWeb({
                    images: [{
                        row: 0,
                        fileName: 'standard.jpg',
                        src: '/content/images/2018/08/standard.jpg',
                        width: 1000,
                        height: 1600
                    }],
                    caption: ''
                });

                assert.match(result.html, /standard\.jpg 1000w" sizes="\(min-width: 720px\) 720px"/);
            });

            it('is omitted when srcsets are not available', function () {
                const result = renderForWeb({
                    images: [{
                        row: 0,
                        fileName: 'standard.jpg',
                        src: '/content/images/2018/08/standard.jpg',
                        width: 720,
                        height: 1600
                    }, {
                        row: 0,
                        fileName: 'small.jpg',
                        src: '/subdir/support/content/images/2018/08/small.jpg',
                        width: 640,
                        height: 1600
                    }, {
                        row: 0,
                        fileName: 'photo',
                        src: 'https://images.unsplash.com/photo?w=2000',
                        width: 2000,
                        height: 1600
                    }],
                    caption: ''
                }, {imageOptimization: {defaultMaxWidth: 2000, contentImageSizes, srcsets: false}});

                assert.equal(result.html.match(/sizes="(.*?)"/g), null);
            });
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

        it('adds width/height and uses resized images', function () {
            const result = renderForEmail({
                images: [{
                    row: 0,
                    fileName: 'standard.jpg',
                    src: '/content/images/2018/08/standard.jpg',
                    width: 720,
                    height: 1600
                }, {
                    row: 0,
                    fileName: 'small.jpg',
                    src: '/subdir/support/content/images/2018/08/small.jpg',
                    width: 300,
                    height: 800
                }, {
                    row: 1,
                    fileName: 'photo.jpg',
                    src: '/content/images/2018/08/photo.jpg',
                    width: 2000,
                    height: 1600
                }, {
                    row: 1,
                    fileName: 'unsplash.jpg',
                    src: 'https://images.unsplash.com/unsplash.jpg?w=2000',
                    width: 2000,
                    height: 1600
                }],
                caption: ''
            });

            // 3 images wider than 600px template width resized to fit
            assert.equal(result.html.match(/width="600"/g)!.length, 3);
            // 1 image smaller than template width
            assert.match(result.html, /width="300"/);

            assert.match(result.html, /height="1333"/);
            assert.match(result.html, /height="800"/);
            assert.match(result.html, /height="480"/);

            // original because image is < 1600
            assert.match(result.html, /\/content\/images\/2018\/08\/standard\.jpg/);
            // original because image is < 300
            assert.match(result.html, /\/subdir\/support\/content\/images\/2018\/08\/small\.jpg/);
            // resized because image is > 1600
            assert.match(result.html, /\/content\/images\/size\/w1600\/2018\/08\/photo\.jpg/);
            // resized unsplash image
            assert.match(result.html, /https:\/\/images\.unsplash\.com\/unsplash\.jpg\?w=1200/);
        });

        it('resizes width/height attributes but uses original image when local image can\'t be transformed', function () {
            const result = renderForEmail({
                images: [{
                    row: 0,
                    fileName: 'image.png',
                    src: '/content/images/2020/06/image.png',
                    width: 3000,
                    height: 2000
                }],
                caption: ''
            }, {canTransformImage: () => false});

            assert.doesNotMatch(result.html, /width="3000"/);
            assert.match(result.html, /width="600"/);
            assert.doesNotMatch(result.html, /height="2000"/);
            assert.match(result.html, /height="400"/);
            assert.doesNotMatch(result.html, /\/content\/images\/size\/w1600\/2020\/06\/image\.png/);
            assert.match(result.html, /\/content\/images\/2020\/06\/image\.png/);
        });
    });
});
