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

        it('renders an empty span with a missing src', function () {
            const result = renderForWeb({});

            assert.equal(result.element.outerHTML, '<span></span>');
        });

        it('renders a wide image', function () {
            const result = renderForWeb(getTestData({cardWidth: 'wide'}));

            assert(result.element.classList.contains('kg-width-wide'));
        });

        it('uses resized width and height when there\'s a max width', function () {
            const result = renderForWeb(getTestData({
                width: 3000,
                height: 6000
            }), {
                imageOptimization: {
                    ...getExportOptions().imageOptimization,
                    defaultMaxWidth: 2000
                },
                canTransformImage: () => true
            });

            const output = result.element.outerHTML;

            assert(output.includes('width="2000"'));
            assert(output.includes('height="4000"'));
        });

        it('uses original width and height when transform is not available', function () {
            const result = renderForWeb(getTestData({
                width: 3000,
                height: 6000
            }), {
                canTransformImage: () => false
            });

            const output = result.element.outerHTML;

            assert(output.includes('width="3000" height="6000"'));
        });

        describe('srcset attribute', function () {
            it('is included when src is an unsplash image', function () {
                const result = renderForWeb(getTestData({
                    width: 3000,
                    height: 6000,
                    src: 'https://images.unsplash.com/photo-1591672299888-e16a08b6c7ce?ixlib=rb-1.2.1&q=80&fm=jpg&crop=entropy&cs=tinysrgb&w=2000&fit=max&ixid=eyJhcHBfaWQiOjExNzczfQ'
                }));

                const output = result.element.outerHTML;

                assert(output.includes('https://images.unsplash.com/photo-1591672299888-e16a08b6c7ce?ixlib=rb-1.2.1&amp;q=80&amp;fm=jpg&amp;crop=entropy&amp;cs=tinysrgb&amp;w=600&amp;fit=max&amp;ixid=eyJhcHBfaWQiOjExNzczfQ 600w, https://images.unsplash.com/photo-1591672299888-e16a08b6c7ce?ixlib=rb-1.2.1&amp;q=80&amp;fm=jpg&amp;crop=entropy&amp;cs=tinysrgb&amp;w=1000&amp;fit=max&amp;ixid=eyJhcHBfaWQiOjExNzczfQ 1000w, https://images.unsplash.com/photo-1591672299888-e16a08b6c7ce?ixlib=rb-1.2.1&amp;q=80&amp;fm=jpg&amp;crop=entropy&amp;cs=tinysrgb&amp;w=1600&amp;fit=max&amp;ixid=eyJhcHBfaWQiOjExNzczfQ 1600w, https://images.unsplash.com/photo-1591672299888-e16a08b6c7ce?ixlib=rb-1.2.1&amp;q=80&amp;fm=jpg&amp;crop=entropy&amp;cs=tinysrgb&amp;w=2400&amp;fit=max&amp;ixid=eyJhcHBfaWQiOjExNzczfQ 2400w'));
            });

            it('is ommitted when target is email', function () {
                const result = renderForEmail(getTestData());

                const output = result.element.outerHTML;

                assert(!output.includes('srcset'));
            });

            it('is included for absolute images when siteUrl has trailing slash', function () {
                const result = renderForWeb(getTestData({
                    src: 'https://example.com/content/images/2022/11/koenig-lexical.jpg'
                }), {
                    imageOptimization: {
                        ...getExportOptions().imageOptimization
                    },
                    canTransformImage: () => true,
                    siteUrl: 'https://example.com/'
                });

                const output = result.element.outerHTML;

                assert(output.includes('srcset'));
            });

            it('is omitted when no contentImageSizes are passed as options', function () {
                const result = renderForWeb(getTestData(), {
                    imageOptimization: {},
                    canTransformImage: () => true
                });

                const output = result.element.outerHTML;

                assert(!output.includes('srcset'));
            });

            it('is omitted when `srcsets: false` is passed in as an option', function () {
                const result = renderForWeb(getTestData(), {
                    ...getExportOptions(),
                    imageOptimization: {
                        ...getExportOptions().imageOptimization,
                        srcsets: false
                    }
                });

                const output = result.element.outerHTML;

                assert(!output.includes('srcset'));
            });

            it('is omitted when canTransformImages is provided and returns false', function () {
                const result = renderForWeb(getTestData(), {
                    ...getExportOptions(),
                    canTransformImage: () => false
                });

                const output = result.element.outerHTML;

                assert(!output.includes('srcset'));
            });

            it('is omitted when no width is provided', function () {
                const result = renderForWeb(getTestData({
                    width: undefined
                }));

                const output = result.element.outerHTML;

                assert(!output.includes('srcset'));
            });

            it('is omitted when image is smaller than minimum responsive width', function () {
                const result = renderForWeb(getTestData({
                    width: 400,
                    height: 200
                }));

                const output = result.element.outerHTML;

                assert(!output.includes('srcset'));
            });

            it('omits sizes larger than image width and includes origin image width if smaller than largest responsive width', function () {
                const result = renderForWeb(getTestData({
                    width: 1200,
                    height: 800
                }));

                const output = result.element.outerHTML;

                // Should not include w1600 or w2400 as they're larger than the image
                assert(!output.includes('w1600'));
                assert(!output.includes('w2400'));
                // Should include smaller sizes
                assert(output.includes('w600'));
                assert(output.includes('w1000'));
            });

            it('works correctly with subdirectories', function () {
                const result = renderForWeb(getTestData({
                    src: '/subdir/content/images/2022/11/koenig-lexical.jpg'
                }), {
                    ...getExportOptions(),
                    subdir: '/subdir'
                });

                const output = result.element.outerHTML;

                assert(output.includes('srcset'));
                assert(output.includes('/subdir/content/images/size/w600/2022/11/koenig-lexical.jpg'));
            });

            it('works correctly with absolute subdirectories', function () {
                const result = renderForWeb(getTestData({
                    src: 'https://example.com/subdir/content/images/2022/11/koenig-lexical.jpg'
                }), {
                    ...getExportOptions(),
                    siteUrl: 'https://example.com/subdir/',
                    subdir: '/subdir'
                });

                const output = result.element.outerHTML;

                assert(output.includes('srcset'));
                assert(output.includes('https://example.com/subdir/content/images/size/w600/2022/11/koenig-lexical.jpg'));
            });

            it('is included when src is an Unsplash image', function () {
                const result = renderForWeb(getTestData({
                    src: 'https://images.unsplash.com/photo-1591672299888-e16a08b6c7ce?ixlib=rb-1.2.1&q=80&fm=jpg&crop=entropy&cs=tinysrgb&w=2000&fit=max&ixid=eyJhcHBfaWQiOjExNzczfQ'
                }));

                const output = result.element.outerHTML;

                assert(output.includes('srcset'));
            });

            it('has same size omission behaviour for Unsplash as local files', function () {
                const result = renderForWeb(getTestData({
                    width: 800,
                    height: 600,
                    src: 'https://images.unsplash.com/photo-1591672299888-e16a08b6c7ce?ixlib=rb-1.2.1&q=80&fm=jpg&crop=entropy&cs=tinysrgb&w=800&fit=max&ixid=eyJhcHBfaWQiOjExNzczfQ'
                }));

                const output = result.element.outerHTML;

                // Should not include sizes larger than the image width
                assert(!output.includes('w1000'));
                assert(!output.includes('w1600'));
                assert(!output.includes('w2400'));
                // Should include 600w
                assert(output.includes('w=600'));
            });
        });

        describe('sizes attribute', function () {
            it('is added for standard images', function () {
                const result = renderForWeb(getTestData({
                    width: 3000,
                    height: 6000
                }));

                const output = result.element.outerHTML;

                assert(output.includes('sizes="(min-width: 720px) 720px"'));
            });

            it('is added for wide images', function () {
                const result = renderForWeb(getTestData({
                    width: 3000,
                    height: 2000,
                    cardWidth: 'wide'
                }));

                const output = result.element.outerHTML;

                assert(output.includes('sizes="(min-width: 1200px) 1200px"'));
            });

            it('is omitted when srcset is not added', function () {
                const result = renderForWeb(getTestData(), {
                    imageOptimization: {},
                    canTransformImage: () => true
                });

                const output = result.element.outerHTML;

                assert(!output.includes('sizes'));
            });

            it('is omitted when width is missing', function () {
                const result = renderForWeb(getTestData({
                    width: undefined
                }));

                const output = result.element.outerHTML;

                assert(!output.includes('sizes'));
            });

            it('is included when only height is missing', function () {
                const result = renderForWeb(getTestData({
                    height: undefined
                }));

                const output = result.element.outerHTML;

                assert(output.includes('sizes'));
            });

            it('is omitted for standard images when width is less than 720', function () {
                const result = renderForWeb(getTestData({
                    width: 600,
                    height: 400
                }));

                const output = result.element.outerHTML;

                assert(!output.includes('sizes'));
            });

            it('is omitted for wide images when width is less than 1200', function () {
                const result = renderForWeb(getTestData({
                    width: 1000,
                    height: 600,
                    cardWidth: 'wide'
                }));

                const output = result.element.outerHTML;

                assert(!output.includes('sizes'));
            });

            it('is omitted for full images', function () {
                const result = renderForWeb(getTestData({
                    cardWidth: 'full'
                }));

                const output = result.element.outerHTML;

                assert(!output.includes('sizes'));
            });
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
