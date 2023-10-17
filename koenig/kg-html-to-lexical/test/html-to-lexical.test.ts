import assert from 'assert/strict';
const converter = require('../');

const editorConfig = {
    onError(e: Error) {
        throw e;
    }
};

interface LexicalNode {
    type: string;
}

describe('HTMLtoLexical', function () {
    describe('Minimal examples', function () {
        it('can convert empty document', function () {
            const lexical = converter.htmlToLexical('', editorConfig);

            assert.deepEqual(lexical, {
                root: {
                    children: [],
                    direction: null,
                    format: '',
                    indent: 0,
                    type: 'root',
                    version: 1
                }
            });
        });

        it('can convert <p>Hello World</p>', function () {
            const lexical = converter.htmlToLexical('<p>Hello World</p>', editorConfig);

            assert.deepEqual(lexical, {
                root: {
                    children: [
                        {
                            children: [
                                {
                                    detail: 0,
                                    format: 0,
                                    mode: 'normal',
                                    style: '',
                                    text: 'Hello World',
                                    type: 'extended-text',
                                    version: 1
                                }
                            ],
                            direction: null,
                            format: '',
                            indent: 0,
                            type: 'paragraph',
                            version: 1
                        }
                    ],
                    direction: null,
                    format: '',
                    indent: 0,
                    type: 'root',
                    version: 1
                }
            });
        });

        it('can convert <p>Hello</p><p>World</p>', function () {
            const lexical = converter.htmlToLexical('<p>Hello</p><p>World</p>', editorConfig);

            assert.deepEqual(lexical, {
                root: {
                    children: [
                        {
                            children: [
                                {
                                    detail: 0,
                                    format: 0,
                                    mode: 'normal',
                                    style: '',
                                    text: 'Hello',
                                    type: 'extended-text',
                                    version: 1
                                }
                            ],
                            direction: null,
                            format: '',
                            indent: 0,
                            type: 'paragraph',
                            version: 1
                        },
                        {
                            children: [
                                {
                                    detail: 0,
                                    format: 0,
                                    mode: 'normal',
                                    style: '',
                                    text: 'World',
                                    type: 'extended-text',
                                    version: 1
                                }
                            ],
                            direction: null,
                            format: '',
                            indent: 0,
                            type: 'paragraph',
                            version: 1
                        }
                    ],
                    direction: null,
                    format: '',
                    indent: 0,
                    type: 'root',
                    version: 1
                }
            });
        });
    });

    describe('Nested examples', function () {
        const helloWorldDoc = {
            root: {
                children: [
                    {
                        children: [
                            {
                                detail: 0,
                                format: 0,
                                mode: 'normal',
                                style: '',
                                text: 'Hello',
                                type: 'extended-text',
                                version: 1
                            }
                        ],
                        direction: null,
                        format: '',
                        indent: 0,
                        type: 'paragraph',
                        version: 1
                    },
                    {
                        children: [
                            {
                                detail: 0,
                                format: 0,
                                mode: 'normal',
                                style: '',
                                text: 'World',
                                type: 'extended-text',
                                version: 1
                            }
                        ],
                        direction: null,
                        format: '',
                        indent: 0,
                        type: 'paragraph',
                        version: 1
                    }
                ],
                direction: null,
                format: '',
                indent: 0,
                type: 'root',
                version: 1
            }
        };

        it('can convert <div><p>Hello</p><p>World</p></div>', function () {
            const lexical = converter.htmlToLexical('<div><p>Hello</p><p>World</p></div>', editorConfig);
            assert.deepEqual(lexical, helloWorldDoc);
        });

        it('can convert <div><div><p>Hello</p><p>World</p></div></div>', function () {
            const lexical = converter.htmlToLexical('<div><div><p>Hello</p><p>World</p></div></div>', editorConfig);
            assert.deepEqual(lexical, helloWorldDoc);
        });

        it('can convert <div><section><p>Hello</p></section><div><p>World</p></div></div>', function () {
            const lexical = converter.htmlToLexical('<div><section><p>Hello</p></section><div><p>World</p></div></div>', editorConfig);
            assert.deepEqual(lexical, helloWorldDoc);
        });

        it('can convert <div><p>Hello</p><div><p>World</p></div></div>', function () {
            const lexical = converter.htmlToLexical('<div><p>Hello</p><div><p>World</p></div></div>', editorConfig);
            assert.deepEqual(lexical, helloWorldDoc);
        });

        it('can convert with whitespace', function () {
            const lexical = converter.htmlToLexical(`
                <div>
                    <p>Hello</p>
                    <div>
                        <p>World</p>
                    </div>
                </div>
            `, editorConfig);

            assert.deepEqual(lexical, helloWorldDoc);
        });
    });

    describe('HTML nodes', function () {
        it('can convert headings', function () {
            const lexical = converter.htmlToLexical('<h1>Hello World</h1>', editorConfig);

            assert.ok(lexical.root);
            assert.equal(lexical.root.children.length, 1);
            assert.equal(lexical.root.children[0].type, 'extended-heading');
            assert.equal(lexical.root.children[0].tag, 'h1');
            assert.equal(lexical.root.children[0].children.length, 1);
            assert.equal(lexical.root.children[0].children[0].text, 'Hello World');
        });

        it('can convert links', function () {
            const lexical = converter.htmlToLexical('<a href="https://example.com">Hello World</a>', editorConfig);

            assert.ok(lexical.root);
            assert.equal(lexical.root.children.length, 1);
            assert.equal(lexical.root.children[0].type, 'link');
            assert.equal(lexical.root.children[0].url, 'https://example.com');
            assert.equal(lexical.root.children[0].children.length, 1);
            assert.equal(lexical.root.children[0].children[0].text, 'Hello World');
        });

        it('can convert lists', function () {
            const lexical = converter.htmlToLexical('<ul><li>Hello</li><li>World</li></ul>', editorConfig);

            assert.ok(lexical.root);
            assert.equal(lexical.root.children.length, 1);
            assert.equal(lexical.root.children[0].type, 'list');
            assert.equal(lexical.root.children[0].listType, 'bullet');
            assert.equal(lexical.root.children[0].children.length, 2);
            assert.equal(lexical.root.children[0].children[0].type, 'listitem');
            assert.equal(lexical.root.children[0].children[0].children.length, 1);
            assert.equal(lexical.root.children[0].children[0].children[0].text, 'Hello');
            assert.equal(lexical.root.children[0].children[1].type, 'listitem');
            assert.equal(lexical.root.children[0].children[1].children.length, 1);
            assert.equal(lexical.root.children[0].children[1].children[0].text, 'World');
        });

        it('can convert blockquotes', function () {
            const lexical = converter.htmlToLexical('<blockquote>Hello World</blockquote>', editorConfig);

            assert.ok(lexical.root);
            assert.equal(lexical.root.children.length, 1);
            assert.equal(lexical.root.children[0].type, 'quote');
            assert.equal(lexical.root.children[0].children.length, 1);
            assert.equal(lexical.root.children[0].children[0].text, 'Hello World');
        });
    });

    describe('Custom nodes', function () {
        it('can convert <hr> into a card', function () {
            // $insertNodes() doesn't work with just decorators, uses $appendNodes() instead
            const lexical = converter.htmlToLexical('<hr>', editorConfig);

            assert.ok(lexical.root);
            assert.equal(lexical.root.children.length, 1);
            assert.equal(lexical.root.children[0].type, 'horizontalrule');
        });

        it('can convert multiple <hr> into cards', function () {
            // $insertNodes() doesn't work with just decorators, uses $appendNodes() instead
            const lexical = converter.htmlToLexical('<hr><hr>', editorConfig);

            assert.ok(lexical.root);
            assert.equal(lexical.root.children.length, 2);
            assert.equal(lexical.root.children[0].type, 'horizontalrule');
            assert.equal(lexical.root.children[1].type, 'horizontalrule');
        });

        it('can convert <p>Hello World</p><hr> into cards', function () {
            // ensure decorators still get inserted OK after other nodes
            const lexical = converter.htmlToLexical('<p>Hello World</p><hr>', editorConfig);

            assert.ok(lexical.root);
            assert.equal(lexical.root.children.length, 2);
            assert.equal(lexical.root.children[0].type, 'paragraph');
            assert.equal(lexical.root.children[0].children.length, 1);
            assert.equal(lexical.root.children[0].children[0].text, 'Hello World');
            assert.equal(lexical.root.children[1].type, 'horizontalrule');
        });

        it('can convert <hr><p>Hello World</p> into cards', function () {
            // ensure decorators still get inserted OK before other nodes
            const lexical = converter.htmlToLexical('<hr><p>Hello World</p>', editorConfig);

            assert.ok(lexical.root);
            assert.equal(lexical.root.children.length, 2);
            assert.equal(lexical.root.children[0].type, 'horizontalrule');
            assert.equal(lexical.root.children[1].type, 'paragraph');
            assert.equal(lexical.root.children[1].children.length, 1);
            assert.equal(lexical.root.children[1].children[0].text, 'Hello World');
        });

        it('can convert alternative quote styles', function () {
            const lexical = converter.htmlToLexical('<blockquote class="kg-blockquote-alt">Hello World</blockquote>', editorConfig);

            assert.ok(lexical.root);
            assert.equal(lexical.root.children.length, 1);
            assert.equal(lexical.root.children[0].type, 'quote');
            assert.equal(lexical.root.children[0].children.length, 1);
            assert.equal(lexical.root.children[0].children[0].text, 'Hello World');
        });
    });

    describe('Unknown elements', function () {
        it('handles aside elements', function () {
            const lexical = converter.htmlToLexical('<aside>Hello World</aside>', editorConfig);

            assert.ok(lexical.root);
            assert.equal(lexical.root.children.length, 1);
            assert.equal(lexical.root.children[0].type, 'paragraph');
            assert.equal(lexical.root.children[0].children.length, 1);
            assert.equal(lexical.root.children[0].children[0].text, 'Hello World');
        });
    });

    describe('HTML from Lexical cards', function () {
        // note: some cards are not intended to convert from html: markdown and email-only cards
        //  this test is to make sure our parser methods do not intercept the cards they are not intended to handle
        it('can convert a post containing one of each card type', function () {
            const html = `
            <figure class="kg-card kg-image-card kg-card-hascaption">
                <img
                    src="__GHOST_URL__/content/images/2023/10/image--1-.png"
                    class="kg-image"
                    alt=""
                    loading="lazy"
                    width="882"
                    height="242"
                    srcset="
                        __GHOST_URL__/content/images/size/w600/2023/10/image--1-.png 600w,
                        __GHOST_URL__/content/images/2023/10/image--1-.png           882w
                    "
                    sizes="(min-width: 720px) 720px"
                />
                <figcaption><span style="white-space: pre-wrap">image</span></figcaption>
            </figure>
            <p>markdown</p>
            <!--kg-card-begin: html-->
            html
            <!--kg-card-end: html-->
            <figure class="kg-card kg-gallery-card kg-width-wide kg-card-hascaption">
                <div class="kg-gallery-container">
                    <div class="kg-gallery-row">
                        <div class="kg-gallery-image">
                            <img
                                src="__GHOST_URL__/content/images/2023/10/4b061cbc7f034c4d475797e8f3d37f68.jpg"
                                width="736"
                                height="736"
                                loading="lazy"
                                alt=""
                                srcset="
                                    __GHOST_URL__/content/images/size/w600/2023/10/4b061cbc7f034c4d475797e8f3d37f68.jpg 600w,
                                    __GHOST_URL__/content/images/2023/10/4b061cbc7f034c4d475797e8f3d37f68.jpg           736w
                                "
                                sizes="(min-width: 720px) 720px"
                            />
                        </div>
                        <div class="kg-gallery-image">
                            <img
                                src="__GHOST_URL__/content/images/2023/10/2560px-Mandolin_guitar_band_crystal_palace.jpg"
                                width="2000"
                                height="1526"
                                loading="lazy"
                                alt=""
                                srcset="
                                    __GHOST_URL__/content/images/size/w600/2023/10/2560px-Mandolin_guitar_band_crystal_palace.jpg   600w,
                                    __GHOST_URL__/content/images/size/w1000/2023/10/2560px-Mandolin_guitar_band_crystal_palace.jpg 1000w,
                                    __GHOST_URL__/content/images/size/w1600/2023/10/2560px-Mandolin_guitar_band_crystal_palace.jpg 1600w,
                                    __GHOST_URL__/content/images/size/w2400/2023/10/2560px-Mandolin_guitar_band_crystal_palace.jpg 2400w
                                "
                                sizes="(min-width: 720px) 720px"
                            />
                        </div>
                    </div>
                </div>
                <figcaption>
                    <p dir="ltr"><span style="white-space: pre-wrap">gallery</span></p>
                </figcaption>
            </figure>
            <hr />
            <figure class="kg-card kg-bookmark-card kg-card-hascaption">
                <a class="kg-bookmark-container" href="https://ghost.org/">
                    <div class="kg-bookmark-content">
                        <div class="kg-bookmark-title">
                            Ghost: The Creator Economy Platform
                        </div>
                        <div class="kg-bookmark-description">
                            The world’s most popular modern publishing platform for creating
                            a new media platform. Used by Apple, SkyNews, Buffer,
                            Kickstarter, and thousands more.
                        </div>
                        <div class="kg-bookmark-metadata">
                            <img
                                class="kg-bookmark-icon"
                                src="https://ghost.org/favicon.ico"
                                alt=""
                            /><span class="kg-bookmark-author"
                                >Ghost - The Professional Publishing Platform</span
                            >
                        </div>
                    </div>
                    <div class="kg-bookmark-thumbnail">
                        <img src="https://ghost.org/images/meta/ghost.png" alt="" />
                    </div>
                </a>
                <figcaption>
                    <p dir="ltr"><span style="white-space: pre-wrap">bookmark</span></p>
                </figcaption>
            </figure>
            <!--members-only-->
            <div class="kg-card kg-button-card kg-align-center">
                <a href="__GHOST_URL__/" class="kg-btn kg-btn-accent">button</a>
            </div>
            <div class="kg-card kg-callout-card kg-callout-card-blue">
                <div class="kg-callout-emoji">💡</div>
                <div class="kg-callout-text">callout</div>
            </div>
            <div class="kg-card kg-toggle-card" data-kg-toggle-state="close">
                <div class="kg-toggle-heading">
                    <h4 class="kg-toggle-heading-text">
                        <span style="white-space: pre-wrap">toggle header</span>
                    </h4>
                    <button class="kg-toggle-card-icon">
                        <svg
                            id="Regular"
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                        >
                            <path
                                class="cls-1"
                                d="M23.25,7.311,12.53,18.03a.749.749,0,0,1-1.06,0L.75,7.311"
                            ></path>
                        </svg>
                    </button>
                </div>
                <div class="kg-toggle-content">
                    <p dir="ltr">
                        <span style="white-space: pre-wrap">toggle content</span>
                    </p>
                </div>
            </div>
            <figure
                class="kg-card kg-video-card kg-width-regular kg-card-hascaption"
                data-kg-thumbnail="http://localhost:2368/content/media/2023/10/CleanShot-2023-03-24-at-11.10.13_thumb.jpg"
                data-kg-custom-thumbnail=""
            >
                <div class="kg-video-container">
                    <video
                        src="__GHOST_URL__/content/media/2023/10/CleanShot-2023-03-24-at-11.10.13.mp4"
                        poster="https://img.spacergif.org/v1/884x744/0a/spacer.png"
                        width="884"
                        height="744"
                        playsinline=""
                        preload="metadata"
                        style="
                            background: transparent
                                url('__GHOST_URL__/content/media/2023/10/CleanShot-2023-03-24-at-11.10.13_thumb.jpg')
                                50% 50% / cover no-repeat;
                        "
                    ></video>
                    <div class="kg-video-overlay">
                        <button class="kg-video-large-play-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                                <path
                                    d="M23.14 10.608 2.253.164A1.559 1.559 0 0 0 0 1.557v20.887a1.558 1.558 0 0 0 2.253 1.392L23.14 13.393a1.557 1.557 0 0 0 0-2.785Z"
                                ></path>
                            </svg>
                        </button>
                    </div>
                    <div class="kg-video-player-container">
                        <div class="kg-video-player">
                            <button class="kg-video-play-icon">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                                    <path
                                        d="M23.14 10.608 2.253.164A1.559 1.559 0 0 0 0 1.557v20.887a1.558 1.558 0 0 0 2.253 1.392L23.14 13.393a1.557 1.557 0 0 0 0-2.785Z"
                                    ></path>
                                </svg>
                            </button>
                            <button class="kg-video-pause-icon kg-video-hide">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                                    <rect
                                        x="3"
                                        y="1"
                                        width="7"
                                        height="22"
                                        rx="1.5"
                                        ry="1.5"
                                    ></rect>
                                    <rect
                                        x="14"
                                        y="1"
                                        width="7"
                                        height="22"
                                        rx="1.5"
                                        ry="1.5"
                                    ></rect>
                                </svg>
                            </button>
                            <span class="kg-video-current-time">0:00</span>
                            <div class="kg-video-time">
                                /<span class="kg-video-duration">0:30</span>
                            </div>
                            <input
                                type="range"
                                class="kg-video-seek-slider"
                                max="100"
                                value="0"
                            />
                            <button class="kg-video-playback-rate">1×</button>
                            <button class="kg-video-unmute-icon">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                                    <path
                                        d="M15.189 2.021a9.728 9.728 0 0 0-7.924 4.85.249.249 0 0 1-.221.133H5.25a3 3 0 0 0-3 3v2a3 3 0 0 0 3 3h1.794a.249.249 0 0 1 .221.133 9.73 9.73 0 0 0 7.924 4.85h.06a1 1 0 0 0 1-1V3.02a1 1 0 0 0-1.06-.998Z"
                                    ></path>
                                </svg>
                            </button>
                            <button class="kg-video-mute-icon kg-video-hide">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                                    <path
                                        d="M16.177 4.3a.248.248 0 0 0 .073-.176v-1.1a1 1 0 0 0-1.061-1 9.728 9.728 0 0 0-7.924 4.85.249.249 0 0 1-.221.133H5.25a3 3 0 0 0-3 3v2a3 3 0 0 0 3 3h.114a.251.251 0 0 0 .177-.073ZM23.707 1.706A1 1 0 0 0 22.293.292l-22 22a1 1 0 0 0 0 1.414l.009.009a1 1 0 0 0 1.405-.009l6.63-6.631A.251.251 0 0 1 8.515 17a.245.245 0 0 1 .177.075 10.081 10.081 0 0 0 6.5 2.92 1 1 0 0 0 1.061-1V9.266a.247.247 0 0 1 .073-.176Z"
                                    ></path>
                                </svg>
                            </button>
                            <input
                                type="range"
                                class="kg-video-volume-slider"
                                max="100"
                                value="100"
                            />
                        </div>
                    </div>
                </div>
                <figcaption>
                    <p dir="ltr"><span style="white-space: pre-wrap">video</span></p>
                </figcaption>
            </figure>
            <div class="kg-card kg-audio-card">
                <img
                    src=""
                    alt="audio-thumbnail"
                    class="kg-audio-thumbnail kg-audio-hide"
                />
                <div class="kg-audio-thumbnail placeholder">
                    <svg width="24" height="24" fill="none">
                        <path
                            fill-rule="evenodd"
                            clip-rule="evenodd"
                            d="M7.5 15.33a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm-2.25.75a2.25 2.25 0 1 1 4.5 0 2.25 2.25 0 0 1-4.5 0ZM15 13.83a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm-2.25.75a2.25 2.25 0 1 1 4.5 0 2.25 2.25 0 0 1-4.5 0Z"
                        ></path>
                        <path
                            fill-rule="evenodd"
                            clip-rule="evenodd"
                            d="M14.486 6.81A2.25 2.25 0 0 1 17.25 9v5.579a.75.75 0 0 1-1.5 0v-5.58a.75.75 0 0 0-.932-.727.755.755 0 0 1-.059.013l-4.465.744a.75.75 0 0 0-.544.72v6.33a.75.75 0 0 1-1.5 0v-6.33a2.25 2.25 0 0 1 1.763-2.194l4.473-.746Z"
                        ></path>
                        <path
                            fill-rule="evenodd"
                            clip-rule="evenodd"
                            d="M3 1.5a.75.75 0 0 0-.75.75v19.5a.75.75 0 0 0 .75.75h18a.75.75 0 0 0 .75-.75V5.133a.75.75 0 0 0-.225-.535l-.002-.002-3-2.883A.75.75 0 0 0 18 1.5H3ZM1.409.659A2.25 2.25 0 0 1 3 0h15a2.25 2.25 0 0 1 1.568.637l.003.002 3 2.883a2.25 2.25 0 0 1 .679 1.61V21.75A2.25 2.25 0 0 1 21 24H3a2.25 2.25 0 0 1-2.25-2.25V2.25c0-.597.237-1.169.659-1.591Z"
                        ></path>
                    </svg>
                </div>
                <div class="kg-audio-player-container">
                    <audio
                        src="__GHOST_URL__/content/media/2023/10/redal660320d1_02_Im_Thinking_Tonight_of_My_Blue_Eyes.mp3"
                        preload="metadata"
                    ></audio>
                    <div class="kg-audio-title">
                        Redal660320d1 02 Im Thinking Tonight of My Blue Eyes
                    </div>
                    <div class="kg-audio-player">
                        <button class="kg-audio-play-icon">
                            <svg viewBox="0 0 24 24">
                                <path
                                    d="M23.14 10.608 2.253.164A1.559 1.559 0 0 0 0 1.557v20.887a1.558 1.558 0 0 0 2.253 1.392L23.14 13.393a1.557 1.557 0 0 0 0-2.785Z"
                                ></path>
                            </svg></button
                        ><button class="kg-audio-pause-icon kg-audio-hide">
                            <svg viewBox="0 0 24 24">
                                <rect
                                    x="3"
                                    y="1"
                                    width="7"
                                    height="22"
                                    rx="1.5"
                                    ry="1.5"
                                ></rect>
                                <rect
                                    x="14"
                                    y="1"
                                    width="7"
                                    height="22"
                                    rx="1.5"
                                    ry="1.5"
                                ></rect>
                            </svg></button
                        ><span class="kg-audio-current-time">0:00</span>
                        <div class="kg-audio-time">
                            /<span class="kg-audio-duration">152.607347</span>
                        </div>
                        <input
                            type="range"
                            class="kg-audio-seek-slider"
                            max="100"
                            value="0"
                        /><button class="kg-audio-playback-rate">1×</button
                        ><button class="kg-audio-unmute-icon">
                            <svg viewBox="0 0 24 24">
                                <path
                                    d="M15.189 2.021a9.728 9.728 0 0 0-7.924 4.85.249.249 0 0 1-.221.133H5.25a3 3 0 0 0-3 3v2a3 3 0 0 0 3 3h1.794a.249.249 0 0 1 .221.133 9.73 9.73 0 0 0 7.924 4.85h.06a1 1 0 0 0 1-1V3.02a1 1 0 0 0-1.06-.998Z"
                                ></path>
                            </svg></button
                        ><button class="kg-audio-mute-icon kg-audio-hide">
                            <svg viewBox="0 0 24 24">
                                <path
                                    d="M16.177 4.3a.248.248 0 0 0 .073-.176v-1.1a1 1 0 0 0-1.061-1 9.728 9.728 0 0 0-7.924 4.85.249.249 0 0 1-.221.133H5.25a3 3 0 0 0-3 3v2a3 3 0 0 0 3 3h.114a.251.251 0 0 0 .177-.073ZM23.707 1.706A1 1 0 0 0 22.293.292l-22 22a1 1 0 0 0 0 1.414l.009.009a1 1 0 0 0 1.405-.009l6.63-6.631A.251.251 0 0 1 8.515 17a.245.245 0 0 1 .177.075 10.081 10.081 0 0 0 6.5 2.92 1 1 0 0 0 1.061-1V9.266a.247.247 0 0 1 .073-.176Z"
                                ></path>
                            </svg></button
                        ><input
                            type="range"
                            class="kg-audio-volume-slider"
                            max="100"
                            value="100"
                        />
                    </div>
                </div>
            </div>
            <div class="kg-card kg-file-card">
                <a
                    class="kg-file-card-container"
                    href="__GHOST_URL__/content/files/2023/10/20170622_WCR_Sensory_Lexicon_2-0-1.pdf"
                    title="Download"
                    download=""
                >
                    <div class="kg-file-card-contents">
                        <div class="kg-file-card-title">
                            20170622_WCR_Sensory_Lexicon_2-0-1
                        </div>
                        <div class="kg-file-card-caption"></div>
                        <div class="kg-file-card-metadata">
                            <div class="kg-file-card-filename">
                                20170622_WCR_Sensory_Lexicon_2-0-1.pdf
                            </div>
                            <div class="kg-file-card-filesize">1 MB</div>
                        </div>
                    </div>
                    <div class="kg-file-card-icon">
                        <svg viewBox="0 0 24 24">
                            <defs>
                                <style>
                                    .a {
                                        fill: none;
                                        stroke: currentColor;
                                        stroke-linecap: round;
                                        stroke-linejoin: round;
                                        stroke-width: 1.5px;
                                    }
                                </style>
                            </defs>
                            <title>download-circle</title>
                            <polyline
                                class="a"
                                points="8.25 14.25 12 18 15.75 14.25"
                            ></polyline>
                            <line class="a" x1="12" y1="6.75" x2="12" y2="18"></line>
                            <circle class="a" cx="12" cy="12" r="11.25"></circle>
                        </svg>
                    </div>
                </a>
            </div>
            <div class="kg-card kg-product-card">
                <div class="kg-product-card-container">
                    <img
                        src="__GHOST_URL__/content/images/2023/10/CleanShot-2023-07-19-at-12.57.37@2x.png"
                        width="724"
                        height="76"
                        class="kg-product-card-image"
                        loading="lazy"
                    />
                    <div class="kg-product-card-title-container">
                        <h4 class="kg-product-card-title">
                            <span style="white-space: pre-wrap">product title</span>
                        </h4>
                    </div>

                    <div class="kg-product-card-description">
                        <p dir="ltr">
                            <span style="white-space: pre-wrap">product description</span>
                        </p>
                    </div>
                </div>
            </div>
            <div
                class="kg-card kg-header-card kg-v2 kg-width-full kg-content-wide"
                style="background-color: #000000"
                data-background-color="#000000"
            >
                <div class="kg-header-card-content">
                    <div class="kg-header-card-text kg-align-center">
                        <h2
                            id="header-v2"
                            class="kg-header-card-heading"
                            style="color: #ffffff"
                            data-text-color="#FFFFFF"
                        >
                            <span style="white-space: pre-wrap">header v2</span>
                        </h2>
                        <p
                            id="subheader"
                            class="kg-header-card-subheading"
                            style="color: #ffffff"
                            data-text-color="#FFFFFF"
                        >
                            <span style="white-space: pre-wrap">subheader</span>
                        </p>
                    </div>
                </div>
            </div>
            <div
                class="kg-card kg-signup-card kg-width-wide"
                data-lexical-signup-form=""
                style="background-color: #f0f0f0; display: none"
            >
                <div class="kg-signup-card-content">
                    <div class="kg-signup-card-text">
                        <h2 class="kg-signup-card-heading" style="color: #000000">
                            <span style="white-space: pre-wrap">Sign up for test site</span>
                        </h2>
                        <p class="kg-signup-card-subheading" style="color: #000000">
                            <span style="white-space: pre-wrap"
                                >Thoughts, stories and ideas.</span
                            >
                        </p>

                        <form class="kg-signup-card-form" data-members-form="signup">
                            <div class="kg-signup-card-fields">
                                <input
                                    class="kg-signup-card-input"
                                    id="email"
                                    data-members-email=""
                                    type="email"
                                    required="true"
                                    placeholder="Your email"
                                />
                                <button
                                    class="kg-signup-card-button kg-style-accent"
                                    style="color: #ffffff"
                                    type="submit"
                                >
                                    <span class="kg-signup-card-button-default"
                                        >Subscribe</span
                                    >
                                    <span class="kg-signup-card-button-loading"
                                        ><svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            height="24"
                                            width="24"
                                            viewBox="0 0 24 24"
                                        >
                                            <g
                                                stroke-linecap="round"
                                                stroke-width="2"
                                                fill="currentColor"
                                                stroke="none"
                                                stroke-linejoin="round"
                                                class="nc-icon-wrapper"
                                            >
                                                <g class="nc-loop-dots-4-24-icon-o">
                                                    <circle cx="4" cy="12" r="3"></circle>
                                                    <circle cx="12" cy="12" r="3"></circle>
                                                    <circle cx="20" cy="12" r="3"></circle>
                                                </g>
                                                <style data-cap="butt">
                                                    .nc-loop-dots-4-24-icon-o {
                                                        --animation-duration: 0.8s;
                                                    }

                                                    .nc-loop-dots-4-24-icon-o * {
                                                        opacity: 0.4;
                                                        transform: scale(0.75);
                                                        animation: nc-loop-dots-4-anim
                                                            var(--animation-duration)
                                                            infinite;
                                                    }

                                                    .nc-loop-dots-4-24-icon-o
                                                        :nth-child(1) {
                                                        transform-origin: 4px 12px;
                                                        animation-delay: -0.3s;
                                                        animation-delay: calc(
                                                            var(--animation-duration) /
                                                                -2.666
                                                        );
                                                    }

                                                    .nc-loop-dots-4-24-icon-o
                                                        :nth-child(2) {
                                                        transform-origin: 12px 12px;
                                                        animation-delay: -0.15s;
                                                        animation-delay: calc(
                                                            var(--animation-duration) /
                                                                -5.333
                                                        );
                                                    }

                                                    .nc-loop-dots-4-24-icon-o
                                                        :nth-child(3) {
                                                        transform-origin: 20px 12px;
                                                    }

                                                    @keyframes nc-loop-dots-4-anim {
                                                        0%,
                                                        100% {
                                                            opacity: 0.4;
                                                            transform: scale(0.75);
                                                        }

                                                        50% {
                                                            opacity: 1;
                                                            transform: scale(1);
                                                        }
                                                    }
                                                </style>
                                            </g>
                                        </svg></span
                                    >
                                </button>
                            </div>
                            <div class="kg-signup-card-success" style="color: #000000">
                                Email sent! Check your inbox to complete your signup.
                            </div>
                            <div
                                class="kg-signup-card-error"
                                style="color: #000000"
                                data-members-error=""
                            ></div>
                        </form>

                        <p class="kg-signup-card-disclaimer" style="color: #000000">
                            <span style="white-space: pre-wrap"
                                >No spam. Unsubscribe anytime.</span
                            >
                        </p>
                    </div>
                </div>
            </div>
            `;

            const lexical = converter.htmlToLexical(html, editorConfig);
            const outputNodeTypes = lexical.root.children.map((child: LexicalNode) => child.type);
            assert.equal(outputNodeTypes.length, 16);
            assert.deepEqual(outputNodeTypes, [
                'image',
                'paragraph', // markdown parses as paragraph/text content
                'html',
                'gallery',
                'horizontalrule',
                'bookmark',
                'paywall',
                'button',
                'callout',
                'toggle',
                'video',
                'audio',
                'file',
                'product',
                'header',
                'signup'
            ]);
        });
    });
});
