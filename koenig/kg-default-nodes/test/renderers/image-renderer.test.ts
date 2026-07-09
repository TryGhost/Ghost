import assert from 'node:assert/strict';
import {assertPrettifiesTo, callRenderer, html} from '../test-utils/index.js';

describe('renderers/image-renderer', function () {
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
            feature: {
                pictureImageFormats: true
            },
            canTransformImage: () => true
        };
    }

    function renderForWeb(data: Record<string, unknown>, options?: Record<string, unknown>) {
        return callRenderer('image', data, {...getExportOptions(), ...options});
    }

    function renderForEmail(data: Record<string, unknown>, options?: Record<string, unknown>) {
        return callRenderer('image', data, {...getExportOptions(), ...options, target: 'email'});
    }

    describe('web', function () {
        it('matches snapshot for default test data', function () {
            const result = renderForWeb(getTestData());

            assert.ok(result.html);

            assertPrettifiesTo(result.html, html`
                <figure class="kg-card kg-image-card kg-width-undefined kg-card-hascaption">
                    <picture>
                        <source
                            srcset="
                                /content/images/size/w600/format/avif/2022/11/koenig-lexical.jpg   600w,
                                /content/images/size/w1000/format/avif/2022/11/koenig-lexical.jpg 1000w,
                                /content/images/size/w1600/format/avif/2022/11/koenig-lexical.jpg 1600w,
                                /content/images/size/w2400/format/avif/2022/11/koenig-lexical.jpg 2400w
                            "
                            type="image/avif"
                            sizes="(min-width: 720px) 720px" />
                        <source
                            srcset="
                                /content/images/size/w600/format/webp/2022/11/koenig-lexical.jpg   600w,
                                /content/images/size/w1000/format/webp/2022/11/koenig-lexical.jpg 1000w,
                                /content/images/size/w1600/format/webp/2022/11/koenig-lexical.jpg 1600w,
                                /content/images/size/w2400/format/webp/2022/11/koenig-lexical.jpg 2400w
                            "
                            type="image/webp"
                            sizes="(min-width: 720px) 720px" />
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
                    </picture>
                    <figcaption>This is a<b>caption</b></figcaption>
                </figure>
            `);
        });

        it('renders with href', function () {
            const result = renderForWeb(getTestData({href: 'https://example.com'}));
            assert.ok(result.html.includes('<a href="https://example.com"'));
        });

        it('generates srcset for CDN image URLs when imageBaseUrl is configured', function () {
            const cdnUrl = 'https://cdn.example.com/c/uuid';
            const result = renderForWeb(
                getTestData({src: `${cdnUrl}/content/images/2022/11/koenig-lexical.jpg`}),
                {imageBaseUrl: cdnUrl}
            );

            assert.ok(result.html);

            assertPrettifiesTo(result.html, html`
                <figure class="kg-card kg-image-card kg-width-undefined kg-card-hascaption">
                    <picture>
                        <source
                            srcset="
                                ${cdnUrl}/content/images/size/w600/format/avif/2022/11/koenig-lexical.jpg   600w,
                                ${cdnUrl}/content/images/size/w1000/format/avif/2022/11/koenig-lexical.jpg 1000w,
                                ${cdnUrl}/content/images/size/w1600/format/avif/2022/11/koenig-lexical.jpg 1600w,
                                ${cdnUrl}/content/images/size/w2400/format/avif/2022/11/koenig-lexical.jpg 2400w
                            "
                            type="image/avif"
                            sizes="(min-width: 720px) 720px" />
                        <source
                            srcset="
                                ${cdnUrl}/content/images/size/w600/format/webp/2022/11/koenig-lexical.jpg   600w,
                                ${cdnUrl}/content/images/size/w1000/format/webp/2022/11/koenig-lexical.jpg 1000w,
                                ${cdnUrl}/content/images/size/w1600/format/webp/2022/11/koenig-lexical.jpg 1600w,
                                ${cdnUrl}/content/images/size/w2400/format/webp/2022/11/koenig-lexical.jpg 2400w
                            "
                            type="image/webp"
                            sizes="(min-width: 720px) 720px" />
                        <img
                            src="${cdnUrl}/content/images/2022/11/koenig-lexical.jpg"
                            class="kg-image"
                            alt="This is some alt text"
                            loading="lazy"
                            title="This is a title"
                            width="3840"
                            height="2160"
                            srcset="
                                ${cdnUrl}/content/images/size/w600/2022/11/koenig-lexical.jpg   600w,
                                ${cdnUrl}/content/images/size/w1000/2022/11/koenig-lexical.jpg 1000w,
                                ${cdnUrl}/content/images/size/w1600/2022/11/koenig-lexical.jpg 1600w,
                                ${cdnUrl}/content/images/size/w2400/2022/11/koenig-lexical.jpg 2400w
                            "
                            sizes="(min-width: 720px) 720px" />
                    </picture>
                    <figcaption>This is a<b>caption</b></figcaption>
                </figure>
            `);
        });

        it('does not generate srcset for CDN image URLs when imageBaseUrl is not configured', function () {
            const cdnUrl = 'https://cdn.example.com/c/uuid';
            const result = renderForWeb(
                getTestData({src: `${cdnUrl}/content/images/2022/11/koenig-lexical.jpg`})
            );

            assert.ok(result.html);
            assert.ok(!result.html.includes('srcset'));
        });

        it('does not render picture markup when labs flag is off', function () {
            const result = renderForWeb(getTestData(), {feature: {pictureImageFormats: false}});

            assert.ok(result.html);
            assert.ok(!result.html.includes('<picture>'));
            assert.ok(result.html.includes('<img'));
        });

        it('does not render picture markup for GIF images', function () {
            const result = renderForWeb(getTestData({src: '/content/images/2022/11/animated.gif'}));

            assert.ok(result.html);
            assert.ok(!result.html.includes('<picture>'));
            assert.ok(result.html.includes('<img'));
        });

        it('renders a minimal image card', function () {
            const result = renderForWeb({
                src: '/image.png',
                width: null,
                height: null,
                href: '',
                title: '',
                alt: '',
                caption: '',
                cardWidth: 'regular'
            });

            assertPrettifiesTo(result.html, html`
                <figure class="kg-card kg-image-card">
                    <img src="/image.png" class="kg-image" alt="" loading="lazy">
                </figure>
            `);
        });

        it('renders an empty container with a missing src', function () {
            const result = renderForWeb(getTestData({src: ''}));

            assert.equal(result.element.outerHTML, '<span></span>');
            assert.equal(result.html, '');
        });

        it('renders a wide image', function () {
            const result = renderForWeb(getTestData({cardWidth: 'wide'}));

            assert.ok(result.html.includes('kg-width-wide'));
        });

        it('uses resized width and height when there\'s a max width', function () {
            const result = renderForWeb(getTestData({width: 3000, height: 6000}), {
                imageOptimization: {
                    ...getExportOptions().imageOptimization,
                    defaultMaxWidth: 2000
                }
            });

            assert.ok(result.html.includes('width="2000"'));
            assert.ok(result.html.includes('height="4000"'));
        });

        it('uses original width and height when transform is not available', function () {
            const result = renderForWeb(getTestData({width: 3000, height: 6000}), {
                canTransformImage: () => false
            });

            assert.ok(result.html.includes('width="3000" height="6000"'));
        });

        describe('srcset attribute', function () {
            it('is included when src is an unsplash image', function () {
                const result = renderForWeb(getTestData({
                    width: 3000,
                    height: 6000,
                    src: 'https://images.unsplash.com/photo-1591672299888-e16a08b6c7ce?ixlib=rb-1.2.1&q=80&fm=jpg&crop=entropy&cs=tinysrgb&w=2000&fit=max&ixid=eyJhcHBfaWQiOjExNzczfQ'
                }));

                assert.ok(result.html.includes('https://images.unsplash.com/photo-1591672299888-e16a08b6c7ce?ixlib=rb-1.2.1&amp;q=80&amp;fm=jpg&amp;crop=entropy&amp;cs=tinysrgb&amp;w=600&amp;fit=max&amp;ixid=eyJhcHBfaWQiOjExNzczfQ 600w, https://images.unsplash.com/photo-1591672299888-e16a08b6c7ce?ixlib=rb-1.2.1&amp;q=80&amp;fm=jpg&amp;crop=entropy&amp;cs=tinysrgb&amp;w=1000&amp;fit=max&amp;ixid=eyJhcHBfaWQiOjExNzczfQ 1000w, https://images.unsplash.com/photo-1591672299888-e16a08b6c7ce?ixlib=rb-1.2.1&amp;q=80&amp;fm=jpg&amp;crop=entropy&amp;cs=tinysrgb&amp;w=1600&amp;fit=max&amp;ixid=eyJhcHBfaWQiOjExNzczfQ 1600w, https://images.unsplash.com/photo-1591672299888-e16a08b6c7ce?ixlib=rb-1.2.1&amp;q=80&amp;fm=jpg&amp;crop=entropy&amp;cs=tinysrgb&amp;w=2400&amp;fit=max&amp;ixid=eyJhcHBfaWQiOjExNzczfQ 2400w'));
            });

            it('is included for absolute images when siteUrl has trailing slash');
            it('is omitted when no contentImageSizes are passed as options');
            it('is omitted when `srcsets: false` is passed in as an option');
            it('is omitted when canTransformImages is provided and returns false');
            it('is omitted when no width is provided');
            it('is omitted when image is smaller than minimum responsive width');
            it('omits sizes larger than image width and includes origin image width if smaller than largest responsive width');
            it('works correctly with subdirectories');
            it('works correctly with absolute subdirectories');
            it('has same size omission behaviour for Unsplash as local files');
        });

        describe('sizes attribute', function () {
            it('is added for standard images', function () {
                const result = renderForWeb(getTestData({width: 3000, height: 6000, cardWidth: 'regular'}));

                assert.ok(result.html.includes('sizes="(min-width: 720px) 720px"'));
            });

            it('is added for wide images', function () {
                const result = renderForWeb(getTestData({width: 3000, height: 2000, cardWidth: 'wide'}));

                assert.ok(result.html.includes('sizes="(min-width: 1200px) 1200px"'));
            });

            it('is omitted when srcset is not added');
            it('is omitted when width is missing');
            it('is included when only height is missing');
            it('is omitted for standard images when width is less than 720');
            it('is omitted for wide images when width is less than 1200');
            it('is omitted for full images');
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

        it('skips the retina src rewrite when imageOptimization is missing', function () {
            const result = renderForEmail(getTestData(), {imageOptimization: undefined});

            assert.ok(result.html.includes('src="/content/images/2022/11/koenig-lexical.jpg"'));
            assert.ok(result.html.includes('width="600"'));
        });

        it('uses retina src for CDN images in email', function () {
            const cdnUrl = 'https://cdn.example.com/c/uuid';
            const result = renderForEmail(
                getTestData({src: `${cdnUrl}/content/images/2022/11/koenig-lexical.jpg`}),
                {imageBaseUrl: cdnUrl}
            );

            assert.ok(result.html);
            assert.ok(result.html.includes(`${cdnUrl}/content/images/size/w1600/2022/11/koenig-lexical.jpg`));
        });

        it('adds width/height and uses resized unsplash image');
        it('adds width/height and uses original src when local image can\'t be transformed');
        it('uses original image if size is smaller than "retina" size');
        it('uses original image width/height if image is smaller than 600px wide');
        it('skips width/height and resize if payload is missing dimensions');
        it('resizes Unsplash images even if width/height data is missing');
        it('omits srcset attribute');
    });
});
