const assert = require('assert/strict');
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

        it('renders images with alt text', function () {
            const result = renderForWeb({
                images: [
                    {
                        row: 0,
                        fileName: 'NatGeo01.jpg',
                        src: '/content/images/2018/08/NatGeo01-9.jpg',
                        width: 3200,
                        height: 1600,
                        alt: 'alt test'
                    }
                ],
                caption: 'Test caption'
            }, {canTransformImage: () => false});

            assertPrettifiesTo(result.html, html`
                <figure class="kg-card kg-gallery-card kg-width-wide kg-card-hascaption">
                    <div class="kg-gallery-container">
                        <div class="kg-gallery-row">
                            <div class="kg-gallery-image"><img src="/content/images/2018/08/NatGeo01-9.jpg" width="3200" height="1600" loading="lazy" alt="alt test" /></div>
                        </div>
                    </div>
                    <figcaption>Test caption</figcaption>
                </figure>
            `);
        });

        it('renders images with blank alt text', function () {
            const result = renderForWeb({
                images: [
                    {
                        row: 0,
                        fileName: 'NatGeo01.jpg',
                        src: '/content/images/2018/08/NatGeo01-9.jpg',
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
                        </div>
                    </div>
                    <figcaption>Test caption</figcaption>
                </figure>
            `);
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
                ]
            }, {
                imageOptimization: {
                    defaultMaxWidth: 2000,
                    contentImageSizes: {
                        w600: {width: 600},
                        w1000: {width: 1000},
                        w1600: {width: 1600},
                        w2400: {width: 2400}
                    }
                }
            });

            const output = result.html;

            // local is resized
            assert(output.match(/width="2000"/));
            assert(output.match(/height="1000"/));
            assert(!output.match(/width="3200"/));
            assert(!output.match(/height="1600"/));

            // unsplash is not
            assert(output.match(/width="2500"/));
            assert(output.match(/height="1800"/));
        });

        it('renders all 9 images in a 3x3 grid', function () {
            const result = renderForWeb({
                type: 'gallery',
                version: 1,
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
            }, {
                // skip srcset
                imageOptimization: {
                    defaultMaxWidth: 2000,
                    contentImageSizes: undefined
                }
            });

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

        describe('srcset', function () {
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
                    }]
                }, {
                    imageOptimization: {
                        defaultMaxWidth: undefined,
                        contentImageSizes: {
                            w600: {width: 600},
                            w1000: {width: 1000},
                            w1600: {width: 1600},
                            w2400: {width: 2400}
                        }
                    }
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
                    }]
                }, {
                    siteUrl: 'https://localhost:2368',
                    imageOptimization: {
                        defaultMaxWidth: undefined,
                        contentImageSizes: {
                            w600: {width: 600},
                            w1000: {width: 1000},
                            w1600: {width: 1600},
                            w2400: {width: 2400}
                        }
                    }
                });

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

            it('is omitted when target === email', function () {
                const result = renderForEmail({
                    images: [{
                        row: 0,
                        fileName: 'NatGeo01.jpg',
                        src: '/content/images/2018/08/NatGeo01-9.jpg',
                        width: 3200,
                        height: 1600
                    }]
                });

                assert(!result.html.includes('srcset='));
            });

            it('is omitted when no contentImageSizes are passed as options', function () {
                const result = renderForWeb({
                    images: [{
                        row: 0,
                        fileName: 'NatGeo01.jpg',
                        src: '/content/images/2018/08/NatGeo01-9.jpg',
                        width: 3200,
                        height: 1600
                    }]
                }, {
                    imageOptimization: {
                        contentImageSizes: undefined
                    }
                });

                assert(!result.html.includes('srcset='));
            });

            it('is omitted when `srcsets: false` is passed as an options', function () {
                const result = renderForWeb({
                    images: [{
                        row: 0,
                        fileName: 'NatGeo01.jpg',
                        src: '/content/images/2018/08/NatGeo01-9.jpg',
                        width: 3200,
                        height: 1600
                    }]
                }, {
                    imageOptimization: {
                        srcsets: false
                    }
                });

                assert(!result.html.includes('srcset='));
            });
        });

        describe('sizes', function () {
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
                    }]
                });

                const output = result.html;
                const sizes = output.match(/sizes="(.*?)"/g);

                assert.equal(sizes.length, 2);

                assert(output.match(/standard\.jpg 720w" sizes="\(min-width: 720px\) 720px"/));
                assert(output.match(/photo\?w=2000 2000w" sizes="\(min-width: 720px\) 720px"/));
            });

            it('uses "wide" media query for large single-image galleries', function () {
                const result = renderForWeb({
                    images: [{
                        row: 0,
                        fileName: 'standard.jpg',
                        src: '/content/images/2018/08/standard.jpg',
                        width: 2000,
                        height: 1600
                    }]
                });

                assert(result.html.match(/standard\.jpg 2000w" sizes="\(min-width: 1200px\) 1200px"/));
            });

            it('uses "standard" media query for medium single-image galleries', function () {
                const result = renderForWeb({
                    images: [{
                        row: 0,
                        fileName: 'standard.jpg',
                        src: '/content/images/2018/08/standard.jpg',
                        width: 1000,
                        height: 1600
                    }]
                });

                assert(result.html.match(/standard\.jpg 1000w" sizes="\(min-width: 720px\) 720px"/));
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
                    }]
                }, {
                    imageOptimization: {
                        srcsets: false
                    }
                });

                const output = result.html;
                const sizes = output.match(/sizes="(.*?)"/g);

                assert(!sizes);
            });
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
                }]
            });

            const output = result.html;

            // 3 images wider than 600px template width resized to fit
            assert.equal(output.match(/width="600"/g).length, 3);
            // 1 image smaller than template width
            assert(output.match(/width="300"/));

            assert(output.match(/height="1333"/));
            assert(output.match(/height="800"/));
            assert(output.match(/height="480"/));

            // original because image is < 1600
            assert(output.match(/\/content\/images\/2018\/08\/standard\.jpg/));
            // original because image is < 300
            assert(output.match(/\/subdir\/support\/content\/images\/2018\/08\/small\.jpg/));
            // resized because image is > 1600
            assert(output.match(/\/content\/images\/size\/w1600\/2018\/08\/photo\.jpg/));
            // resized unsplash image
            assert(output.match(/https:\/\/images\.unsplash\.com\/unsplash\.jpg\?w=1200/));
        });

        it('resizes width/height attributes but uses original image when local image can\'t be transformed', function () {
            const result = renderForEmail({
                images: [{
                    row: 0,
                    fileName: 'image.png',
                    src: '/content/images/2020/06/image.png',
                    width: 3000,
                    height: 2000
                }]
            }, {
                canTransformImage: () => false
            });

            const output = result.html;

            assert(!output.match(/width="3000"/));
            assert(output.match(/width="600"/));
            assert(!output.match(/height="2000"/));
            assert(output.match(/height="400"/));
            assert(!output.match(/\/content\/images\/size\/w1600\/2020\/06\/image\.png/));
            assert(output.match(/\/content\/images\/2020\/06\/image\.png/));
        });
    });
});
