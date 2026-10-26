import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {callRenderer, visibility} from '../test-utils/index.js';
import {renderTransistorNode} from '../../src/nodes/transistor/transistor-renderer.js';

describe('renderers/transistor-renderer', function () {
    function getTestData(overrides = {}) {
        return {
            isEmpty: () => false,
            accentColor: '#15171A',
            backgroundColor: '#ffffff',
            visibility: visibility.buildDefaultVisibility(),
            ...overrides
        };
    }

    function renderForWeb(data: Record<string, unknown>, options?: Record<string, unknown>) {
        return callRenderer('transistor', data, {siteUuid: 'test-site-uuid', accentColor: '#ff0000', ...options});
    }

    function renderForEmail(data: Record<string, unknown>, options?: Record<string, unknown>) {
        return callRenderer('transistor', data, {siteUuid: 'test-site-uuid', accentColor: '#ff0000', ...options, target: 'email'});
    }

    it('defaults options before validating document creation', function () {
        assert.throws(
            () => renderTransistorNode(getTestData()),
            /Must be passed a `createDocument` function as an option when used in a non-browser environment/
        );
    });

    describe('web', function () {
        it('renders iframe embed with data-src', function () {
            const result = renderForWeb(getTestData());

            assert.ok(result.html.includes('<iframe'));
            assert.ok(result.html.includes('data-src="https://partner.transistor.fm/ghost/embed/%7Buuid%7D?ctx=test-site-uuid"'));
            assert.ok(result.html.includes('data-kg-transistor-embed'));
        });

        it('renders noscript fallback iframe', function () {
            const result = renderForWeb(getTestData());

            assert.ok(result.html.includes('<noscript>'));
            assert.ok(result.html.includes('src="https://partner.transistor.fm/ghost/embed/%7Buuid%7D?ctx=test-site-uuid"'));
        });

        it('renders embed script with background detection and resize listener', function () {
            const result = renderForWeb(getTestData());

            assert.ok(result.html.includes('<script>'));
            assert.ok(result.html.includes('initTransistorEmbed'));
            assert.ok(result.html.includes('color-mix(in srgb, '));
            assert.ok(result.html.includes('event.data.type === \'resize\''));
            assert.ok(result.html.includes('partner.transistor.fm'));
            assert.ok(result.html.includes('Number.isSafeInteger'));
        });

        describe('embed script background detection', function () {
            interface EmbedScenario {
                // Computed background-color per wrapper, innermost first
                backgrounds: string[];
                // Computed background-color of the color-mix() probe, keyed by the colour being converted
                srgbConversions?: Record<string, string>;
            }

            function runEmbedScript({backgrounds, srgbConversions = {}}: EmbedScenario) {
                const {html: cardHtml} = renderForWeb(getTestData());
                const markup = backgrounds.reduce((inner, _bg, index) => `<div data-bg-index="${index}">${inner}</div>`, cardHtml);
                const probeValues: string[] = [];
                let canvasContexts = 0;

                const page = new JSDOM(`<body>${markup}</body>`, {
                    runScripts: 'dangerously',
                    beforeParse(window) {
                        const setProperty = window.CSSStyleDeclaration.prototype.setProperty;
                        window.CSSStyleDeclaration.prototype.setProperty = function (property: string, value: string | null, priority?: string) {
                            probeValues.push(`${property}: ${value} !${priority}`);
                            return setProperty.call(this, property, value, priority);
                        };
                        window.HTMLCanvasElement.prototype.getContext = function () {
                            canvasContexts += 1;
                            return null;
                        };
                        window.getComputedStyle = function (element: Element) {
                            if (element.tagName === 'SPAN') {
                                const converting = probeValues.at(-1)?.match(/color-mix\(in srgb, (.+) 100%, transparent\)/)?.[1] ?? '';
                                return {backgroundColor: srgbConversions[converting] ?? 'rgba(0, 0, 0, 0)'} as CSSStyleDeclaration;
                            }
                            const index = element.getAttribute('data-bg-index');
                            return {backgroundColor: index === null ? 'rgba(0, 0, 0, 0)' : backgrounds[Number(index)]} as CSSStyleDeclaration;
                        };
                    }
                });

                const iframe = page.window.document.querySelector('iframe[data-kg-transistor-embed]')!;
                return {
                    background: new URL(iframe.getAttribute('src')!).searchParams.get('background'),
                    probeValues,
                    canvasContexts,
                    probesLeft: page.window.document.querySelectorAll('span').length
                };
            }

            it('sends the first non-transparent ancestor background as hex', function () {
                const result = runEmbedScript({backgrounds: ['rgba(0, 0, 0, 0)', 'rgb(21, 23, 26)', 'rgb(255, 255, 255)']});

                assert.equal(result.background, '15171a');
                assert.deepEqual(result.probeValues, []);
            });

            it('ignores alpha on a semi-transparent background', function () {
                const result = runEmbedScript({backgrounds: ['rgba(255, 0, 0, 0.5)']});

                assert.equal(result.background, 'ff0000');
            });

            it('omits the background when every ancestor is transparent', function () {
                const result = runEmbedScript({backgrounds: ['rgba(0, 0, 0, 0)']});

                assert.equal(result.background, null);
            });

            it('skips ancestors whose background computes to the transparent keyword', function () {
                // Older engines serialise transparent backgrounds as the keyword rather than rgba()
                const result = runEmbedScript({backgrounds: ['transparent', 'rgb(255, 255, 255)']});

                assert.equal(result.background, 'ffffff');
                assert.deepEqual(result.probeValues, []);
            });

            it('omits the background when an rgb() channel is not a number', function () {
                const result = runEmbedScript({backgrounds: ['rgb(none, 0, 0)', 'rgb(255, 255, 255)']});

                assert.equal(result.background, null);
            });

            it('converts modern colour spaces to sRGB with color-mix()', function () {
                const result = runEmbedScript({
                    backgrounds: ['oklch(0.7 0.15 30)'],
                    srgbConversions: {'oklch(0.7 0.15 30)': 'color(srgb 0.928597 0.463193 0.394251)'}
                });

                assert.equal(result.background, 'ed7665');
                assert.deepEqual(result.probeValues, ['background-color: color-mix(in srgb, oklch(0.7 0.15 30) 100%, transparent) !important']);
                assert.equal(result.probesLeft, 0);
            });

            it('reads sRGB backgrounds without the color-mix() probe', function () {
                // Browsers that support color() but not color-mix() could not convert these
                const result = runEmbedScript({backgrounds: ['color(srgb 0.5 0 0.5)']});

                assert.equal(result.background, '800080');
                assert.deepEqual(result.probeValues, []);
            });

            it('ignores alpha on a semi-transparent sRGB background', function () {
                const result = runEmbedScript({backgrounds: ['color(srgb 1 0 0 / 0.5)']});

                assert.equal(result.background, 'ff0000');
                assert.deepEqual(result.probeValues, []);
            });

            it('clamps out-of-gamut colours', function () {
                const result = runEmbedScript({
                    backgrounds: ['color(display-p3 1 0 0)'],
                    srgbConversions: {'color(display-p3 1 0 0)': 'color(srgb 1.09307 -0.226742 -0.150135)'}
                });

                assert.equal(result.background, 'ff0000');
            });

            it('skips converted colours that are fully transparent', function () {
                const result = runEmbedScript({
                    backgrounds: ['oklch(0 0 0 / 0)', 'rgb(255, 255, 255)'],
                    srgbConversions: {'oklch(0 0 0 / 0)': 'color(srgb 0 0 0 / 0)'}
                });

                assert.equal(result.background, 'ffffff');
            });

            it('omits the background for colours it cannot convert', function () {
                // Browsers without color-mix() support ignore the probe style and compute it as transparent
                const result = runEmbedScript({backgrounds: ['oklch(0.7 0.15 30)', 'rgb(255, 255, 255)']});

                assert.equal(result.background, null);
                assert.equal(result.probesLeft, 0);
            });

            it('omits the background when a converted channel is not a number', function () {
                const result = runEmbedScript({
                    backgrounds: ['oklch(none 0 0)'],
                    srgbConversions: {'oklch(none 0 0)': 'color(srgb none 0 0)'}
                });

                assert.equal(result.background, null);
            });

            it('never reads pixels from a canvas', function () {
                const result = runEmbedScript({
                    backgrounds: ['oklch(0.7 0.15 30)'],
                    srgbConversions: {'oklch(0.7 0.15 30)': 'color(srgb 0.928597 0.463193 0.394251)'}
                });

                assert.equal(result.canvasContexts, 0);
            });
        });

        describe('embed script iframe lookup', function () {
            const membersOnly = {
                web: {nonMember: false, memberSegment: visibility.ALL_MEMBERS_SEGMENT},
                email: {memberSegment: visibility.ALL_MEMBERS_SEGMENT}
            };

            // Ghost serves a permitted member the gated content without its wrapping comments
            function renderForMember(siteUuid: string) {
                const {html: gatedHtml} = renderForWeb(getTestData({visibility: membersOnly}), {siteUuid});
                return gatedHtml.replace(/<!--kg-gated-block:begin[^>]*-->([\s\S]*?)<!--kg-gated-block:end-->/g, '$1');
            }

            function loadEmbedSources(contentHtml: string) {
                const page = new JSDOM(`<body><div class="post-content">${contentHtml}</div></body>`, {
                    runScripts: 'dangerously',
                    beforeParse(window) {
                        window.getComputedStyle = () => ({backgroundColor: 'rgba(0, 0, 0, 0)'}) as CSSStyleDeclaration;
                    }
                });

                return [...page.window.document.querySelectorAll('iframe[data-kg-transistor-embed]')].map(iframe => iframe.getAttribute('src'));
            }

            it('loads every card when several cards share a parent', function () {
                const sources = loadEmbedSources(`<p>First</p>${renderForMember('first-card')}<p>Second</p>${renderForMember('second-card')}`);

                assert.deepEqual(sources, [
                    'https://partner.transistor.fm/ghost/embed/%7Buuid%7D?ctx=first-card',
                    'https://partner.transistor.fm/ghost/embed/%7Buuid%7D?ctx=second-card'
                ]);
            });

            it('leaves the iframe alone when the script is not rendered directly after it', function () {
                const sources = loadEmbedSources(renderForMember('moved-card').replace('</iframe><script>', '</iframe><p>Moved</p><script>'));

                assert.deepEqual(sources, [null]);
            });
        });

        it('includes siteUuid as ctx param', function () {
            const result = renderForWeb(getTestData(), {siteUuid: 'my-site-uuid'});

            assert.ok(result.html.includes('ctx=my-site-uuid'));
        });

        it('renders without ctx param when siteUuid is not provided', function () {
            const result = callRenderer('transistor', getTestData(), {});

            assert.ok(result.html.includes('data-src="https://partner.transistor.fm/ghost/embed/%7Buuid%7D"'));
            assert.ok(!result.html.includes('ctx='));
        });

        it('renders with web visibility gating', function () {
            const result = renderForWeb(getTestData({
                visibility: {
                    web: {nonMember: false, memberSegment: visibility.ALL_MEMBERS_SEGMENT},
                    email: {memberSegment: visibility.ALL_MEMBERS_SEGMENT}
                }
            }));

            assert.equal(result.element.tagName, 'TEXTAREA');
            assert.match(result.html, /<!--kg-gated-block:begin nonMember:false memberSegment:"status:free,status:-free" -->/);
        });
    });

    describe('email', function () {
        it('renders email template with {uuid} placeholder', function () {
            const result = renderForEmail(getTestData());

            assert.ok(result.html.includes('%%{uuid}%%'));
        });

        it('renders link to Transistor', function () {
            const result = renderForEmail(getTestData());

            assert.ok(result.html.includes('href="https://partner.transistor.fm/ghost/%%{uuid}%%"'));
            assert.ok(result.html.includes('Listen to your podcasts'));
        });

        it('uses site accent color for icon background', function () {
            const result = renderForEmail(getTestData(), {design: {accentColor: '#ff5500'}});

            assert.ok(result.html.includes('background-color: #ff5500'));
        });

        it('uses default accent color when not provided', function () {
            const result = renderForEmail(getTestData());

            assert.ok(result.html.includes('background-color: #15171A'));
        });
    });
});
