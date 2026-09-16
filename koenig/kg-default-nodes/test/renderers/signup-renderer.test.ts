import assert from 'node:assert/strict';
import {assertPrettifiesTo, callRenderer, html} from '../test-utils/index.js';

describe('renderers/signup-renderer', function () {
    const loadingIcon = `<svg xmlns="http://www.w3.org/2000/svg" height="24" width="24" viewBox="0 0 24 24">
        <g stroke-linecap="round" stroke-width="2" fill="currentColor" stroke="none" stroke-linejoin="round" class="nc-icon-wrapper">
            <g class="nc-loop-dots-4-24-icon-o">
                <circle cx="4" cy="12" r="3"></circle>
                <circle cx="12" cy="12" r="3"></circle>
                <circle cx="20" cy="12" r="3"></circle>
            </g>
            <style data-cap="butt">
                .nc-loop-dots-4-24-icon-o{--animation-duration:0.8s}
                .nc-loop-dots-4-24-icon-o *{opacity:.4;transform:scale(.75);animation:nc-loop-dots-4-anim var(--animation-duration) infinite}
                .nc-loop-dots-4-24-icon-o :nth-child(1){transform-origin:4px 12px;animation-delay:-.3s;animation-delay:calc(var(--animation-duration)/-2.666)}
                .nc-loop-dots-4-24-icon-o :nth-child(2){transform-origin:12px 12px;animation-delay:-.15s;animation-delay:calc(var(--animation-duration)/-5.333)}
                .nc-loop-dots-4-24-icon-o :nth-child(3){transform-origin:20px 12px}
                @keyframes nc-loop-dots-4-anim{0%,100%{opacity:.4;transform:scale(.75)}50%{opacity:1;transform:scale(1)}}
            </style>
        </g>
    </svg>`;

    function getTestData(overrides = {}) {
        return {
            backgroundColor: 'transparent',
            backgroundImageSrc: 'https://example.com/image.jpg',
            backgroundSize: 'cover',
            textColor: '#000000',
            buttonColor: '#000000',
            buttonText: 'Button',
            buttonTextColor: '#ffffff',
            disclaimer: 'Disclaimer',
            header: 'Header',
            subheader: 'Subheader',
            labels: ['label 1', 'label 2'],
            layout: 'regular',
            alignment: 'center',
            successMessage: 'Success!',
            swapped: false,
            ...overrides
        };
    }

    function renderForWeb(data: Record<string, unknown>, options?: Record<string, unknown>) {
        return callRenderer('signup', data, options);
    }

    function renderForEmail(data: Record<string, unknown>, options?: Record<string, unknown>) {
        return callRenderer('signup', data, {...options, target: 'email'});
    }

    describe('web', function () {
        it('matches snapshot for default test data', function () {
            const result = renderForWeb(getTestData());

            assert.ok(result.html);

            assertPrettifiesTo(result.html, html`
                <div class="kg-card kg-signup-card kg-width-regular" data-lexical-signup-form="" style="display: none">
                    <picture>
                        <img class="kg-signup-card-image" src="https://example.com/image.jpg" alt="" />
                    </picture>
                    <div class="kg-signup-card-content">
                        <div class="kg-signup-card-text kg-align-center">
                            <h2 class="kg-signup-card-heading" style="color: #000000">Header</h2>
                            <p class="kg-signup-card-subheading" style="color: #000000">Subheader</p>
                            <form class="kg-signup-card-form" data-members-form="signup">
                                <input data-members-label="" type="hidden" value="label 1" />
                                <input data-members-label="" type="hidden" value="label 2" />
                                <div class="kg-signup-card-fields">
                                    <input class="kg-signup-card-input" id="email" data-members-email="" type="email" required="true" placeholder="jamie@example.com" />
                                    <button class="kg-signup-card-button" style="background-color: #000000; color: #ffffff" type="submit">
                                        <span class="kg-signup-card-button-default">Button</span>
                                        <span class="kg-signup-card-button-loading">
                                            <svg xmlns="http://www.w3.org/2000/svg" height="24" width="24" viewBox="0 0 24 24">
                                                <g stroke-linecap="round" stroke-width="2" fill="currentColor" stroke="none" stroke-linejoin="round" class="nc-icon-wrapper">
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
                                                            animation: nc-loop-dots-4-anim var(--animation-duration) infinite;
                                                        }
                                                        .nc-loop-dots-4-24-icon-o :nth-child(1) {
                                                            transform-origin: 4px 12px;
                                                            animation-delay: -0.3s;
                                                            animation-delay: calc(var(--animation-duration) / -2.666);
                                                        }
                                                        .nc-loop-dots-4-24-icon-o :nth-child(2) {
                                                            transform-origin: 12px 12px;
                                                            animation-delay: -0.15s;
                                                            animation-delay: calc(var(--animation-duration) / -5.333);
                                                        }
                                                        .nc-loop-dots-4-24-icon-o :nth-child(3) {
                                                            transform-origin: 20px 12px;
                                                        }
                                                        @keyframes nc-loop-dots-4-anim {
                                                            0%, 100% {
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
                                            </svg>
                                        </span>
                                    </button>
                                </div>
                                <div class="kg-signup-card-success" style="color: #000000">
                                    Success!
                                </div>
                                <div class="kg-signup-card-error" style="color: #000000" data-members-error=""></div>
                            </form>
                            <p class="kg-signup-card-disclaimer" style="color: #000000">Disclaimer</p>
                        </div>
                    </div>
                </div>
            `);
        });

        it('removes empty elements', function () {
            const result = renderForWeb(getTestData({header: '', subheader: '', disclaimer: ''}));

            assertPrettifiesTo(result.html, html`
                <div class="kg-card kg-signup-card kg-width-regular" data-lexical-signup-form="" style="display:none">
                    <picture><img class="kg-signup-card-image" src="https://example.com/image.jpg" alt=""/></picture>
                    <div class="kg-signup-card-content">
                        <div class="kg-signup-card-text kg-align-center">
                            <form class="kg-signup-card-form" data-members-form="signup">
                                <input data-members-label="" type="hidden" value="label 1">
                                <input data-members-label="" type="hidden" value="label 2">
                                <div class="kg-signup-card-fields">
                                    <input class="kg-signup-card-input" id="email" data-members-email="" type="email" required="true" placeholder="jamie@example.com">
                                    <button class="kg-signup-card-button" style="background-color:#000000;color:#ffffff" type="submit">
                                        <span class="kg-signup-card-button-default">Button</span>
                                        <span class="kg-signup-card-button-loading">${loadingIcon}</span>
                                    </button>
                                </div>
                                <div class="kg-signup-card-success" style="color: #000000">Success!</div>
                                <div class="kg-signup-card-error" style="color: #000000" data-members-error=""></div>
                            </form>
                        </div>
                    </div>
                </div>
            `);
        });

        it('renders accent classes', function () {
            const result = renderForWeb(getTestData({backgroundColor: 'accent', buttonColor: 'accent', backgroundImageSrc: ''}));

            assertPrettifiesTo(result.html, html`
                <div class="kg-card kg-signup-card kg-width-regular kg-style-accent" data-lexical-signup-form="" style="display:none">
                    <div class="kg-signup-card-content">
                        <div class="kg-signup-card-text kg-align-center">
                            <h2 class="kg-signup-card-heading" style="color: #000000">Header</h2>
                            <p class="kg-signup-card-subheading" style="color: #000000">Subheader</p>
                            <form class="kg-signup-card-form" data-members-form="signup">
                                <input data-members-label="" type="hidden" value="label 1">
                                <input data-members-label="" type="hidden" value="label 2">
                                <div class="kg-signup-card-fields">
                                    <input class="kg-signup-card-input" id="email" data-members-email="" type="email" required="true" placeholder="jamie@example.com">
                                    <button class="kg-signup-card-button kg-style-accent" style="color:#ffffff" type="submit">
                                        <span class="kg-signup-card-button-default">Button</span>
                                        <span class="kg-signup-card-button-loading">${loadingIcon}</span>
                                    </button>
                                </div>
                                <div class="kg-signup-card-success" style="color: #000000">Success!</div>
                                <div class="kg-signup-card-error" style="color: #000000" data-members-error=""></div>
                            </form>
                            <p class="kg-signup-card-disclaimer" style="color: #000000">Disclaimer</p>
                        </div>
                    </div>
                </div>
            `);
        });

        it('renders split classes', function () {
            const result = renderForWeb(getTestData({layout: 'split', textColor: ''}));

            assertPrettifiesTo(result.html, html`
                <div class="kg-card kg-signup-card kg-layout-split kg-width-full" data-lexical-signup-form="" style="background-color: transparent; display:none">
                    <div class="kg-signup-card-content">
                        <picture><img class="kg-signup-card-image" src="https://example.com/image.jpg" alt=""></picture>
                        <div class="kg-signup-card-text kg-align-center">
                            <h2 class="kg-signup-card-heading">Header</h2>
                            <p class="kg-signup-card-subheading">Subheader</p>
                            <form class="kg-signup-card-form" data-members-form="signup">
                                <input data-members-label="" type="hidden" value="label 1">
                                <input data-members-label="" type="hidden" value="label 2">
                                <div class="kg-signup-card-fields">
                                    <input class="kg-signup-card-input" id="email" data-members-email="" type="email" required="true" placeholder="jamie@example.com">
                                    <button class="kg-signup-card-button" style="background-color:#000000;color:#ffffff" type="submit">
                                        <span class="kg-signup-card-button-default">Button</span>
                                        <span class="kg-signup-card-button-loading">${loadingIcon}</span>
                                    </button>
                                </div>
                                <div class="kg-signup-card-success">Success!</div>
                                <div class="kg-signup-card-error" data-members-error=""></div>
                            </form>
                            <p class="kg-signup-card-disclaimer">Disclaimer</p>
                        </div>
                    </div>
                </div>
            `);
        });

        it('renders split card swapped', function () {
            const result = renderForWeb(getTestData({layout: 'split', swapped: true, textColor: ''}));

            assertPrettifiesTo(result.html, html`
                <div class="kg-card kg-signup-card kg-layout-split kg-width-full kg-swapped" data-lexical-signup-form="" style="background-color: transparent; display:none">
                    <div class="kg-signup-card-content">
                        <picture><img class="kg-signup-card-image" src="https://example.com/image.jpg" alt=""></picture>
                        <div class="kg-signup-card-text kg-align-center">
                            <h2 class="kg-signup-card-heading">Header</h2>
                            <p class="kg-signup-card-subheading">Subheader</p>
                            <form class="kg-signup-card-form" data-members-form="signup">
                                <input data-members-label="" type="hidden" value="label 1">
                                <input data-members-label="" type="hidden" value="label 2">
                                <div class="kg-signup-card-fields">
                                    <input class="kg-signup-card-input" id="email" data-members-email="" type="email" required="true" placeholder="jamie@example.com">
                                    <button class="kg-signup-card-button" style="background-color:#000000;color:#ffffff" type="submit">
                                        <span class="kg-signup-card-button-default">Button</span>
                                        <span class="kg-signup-card-button-loading">${loadingIcon}</span>
                                    </button>
                                </div>
                                <div class="kg-signup-card-success">Success!</div>
                                <div class="kg-signup-card-error" data-members-error=""></div>
                            </form>
                            <p class="kg-signup-card-disclaimer">Disclaimer</p>
                        </div>
                    </div>
                </div>
            `);
        });

        it('renders background size', function () {
            const result = renderForWeb(getTestData({layout: 'split', backgroundSize: 'contain', textColor: ''}));

            assertPrettifiesTo(result.html, html`
                <div class="kg-card kg-signup-card kg-layout-split kg-width-full kg-content-wide" data-lexical-signup-form="" style="background-color: transparent; display:none">
                    <div class="kg-signup-card-content">
                        <picture><img class="kg-signup-card-image" src="https://example.com/image.jpg" alt=""></picture>
                        <div class="kg-signup-card-text kg-align-center">
                            <h2 class="kg-signup-card-heading">Header</h2>
                            <p class="kg-signup-card-subheading">Subheader</p>
                            <form class="kg-signup-card-form" data-members-form="signup">
                                <input data-members-label="" type="hidden" value="label 1">
                                <input data-members-label="" type="hidden" value="label 2">
                                <div class="kg-signup-card-fields">
                                    <input class="kg-signup-card-input" id="email" data-members-email="" type="email" required="true" placeholder="jamie@example.com">
                                    <button class="kg-signup-card-button" style="background-color:#000000;color:#ffffff" type="submit">
                                        <span class="kg-signup-card-button-default">Button</span>
                                        <span class="kg-signup-card-button-loading">${loadingIcon}</span>
                                    </button>
                                </div>
                                <div class="kg-signup-card-success">Success!</div>
                                <div class="kg-signup-card-error" data-members-error=""></div>
                            </form>
                            <p class="kg-signup-card-disclaimer">Disclaimer</p>
                        </div>
                    </div>
                </div>
            `);
        });

        it('renders text color styles with non-transparent background', function () {
            const result = renderForWeb(getTestData({backgroundColor: '#ffffff'}));

            assertPrettifiesTo(result.html, html`
                <div class="kg-card kg-signup-card kg-width-regular" data-lexical-signup-form="" style="display:none">
                <picture><img class="kg-signup-card-image" src="https://example.com/image.jpg" alt=""></picture>
                    <div class="kg-signup-card-content">
                        <div class="kg-signup-card-text kg-align-center">
                            <h2 class="kg-signup-card-heading" style="color: #000000">Header</h2>
                            <p class="kg-signup-card-subheading" style="color: #000000">Subheader</p>
                            <form class="kg-signup-card-form" data-members-form="signup">
                                <input data-members-label="" type="hidden" value="label 1">
                                <input data-members-label="" type="hidden" value="label 2">
                                <div class="kg-signup-card-fields">
                                    <input class="kg-signup-card-input" id="email" data-members-email="" type="email" required="true" placeholder="jamie@example.com">
                                    <button class="kg-signup-card-button" style="background-color:#000000;color:#ffffff" type="submit">
                                        <span class="kg-signup-card-button-default">Button</span>
                                        <span class="kg-signup-card-button-loading">${loadingIcon}</span>
                                    </button>
                                </div>
                                <div class="kg-signup-card-success" style="color: #000000">Success!</div>
                                <div class="kg-signup-card-error" style="color: #000000" data-members-error=""></div>
                            </form>
                            <p class="kg-signup-card-disclaimer" style="color: #000000">Disclaimer</p>
                        </div>
                    </div>
                </div>
            `);
        });

        it('applies the accent color class if there is no background image', function () {
            const result = renderForWeb(getTestData({backgroundColor: 'accent', backgroundImageSrc: ''}));

            assertPrettifiesTo(result.html, html`
                <div class="kg-card kg-signup-card kg-width-regular kg-style-accent" data-lexical-signup-form="" style="display:none">
                    <div class="kg-signup-card-content">
                        <div class="kg-signup-card-text kg-align-center">
                            <h2 class="kg-signup-card-heading" style="color: #000000">Header</h2>
                            <p class="kg-signup-card-subheading" style="color: #000000">Subheader</p>
                            <form class="kg-signup-card-form" data-members-form="signup">
                                <input data-members-label="" type="hidden" value="label 1">
                                <input data-members-label="" type="hidden" value="label 2">
                                <div class="kg-signup-card-fields">
                                    <input class="kg-signup-card-input" id="email" data-members-email="" type="email" required="true" placeholder="jamie@example.com">
                                    <button class="kg-signup-card-button" style="background-color: #000000; color:#ffffff" type="submit">
                                        <span class="kg-signup-card-button-default">Button</span>
                                        <span class="kg-signup-card-button-loading">${loadingIcon}</span>
                                    </button>
                                </div>
                                <div class="kg-signup-card-success" style="color: #000000">Success!</div>
                                <div class="kg-signup-card-error" style="color: #000000" data-members-error=""></div>
                            </form>
                            <p class="kg-signup-card-disclaimer" style="color: #000000">Disclaimer</p>
                        </div>
                    </div>
                </div>
            `);
        });

        it('applies the accent color class with a split layout', function () {
            const result = renderForWeb(getTestData({backgroundColor: 'accent', layout: 'split'}));

            assertPrettifiesTo(result.html, html`
                <div class="kg-card kg-signup-card kg-layout-split kg-width-full kg-style-accent" data-lexical-signup-form="" style="display:none">
                    <div class="kg-signup-card-content">
                        <picture><img class="kg-signup-card-image" src="https://example.com/image.jpg" alt=""></picture>
                        <div class="kg-signup-card-text kg-align-center">
                            <h2 class="kg-signup-card-heading" style="color: #000000">Header</h2>
                            <p class="kg-signup-card-subheading" style="color: #000000">Subheader</p>
                            <form class="kg-signup-card-form" data-members-form="signup">
                                <input data-members-label="" type="hidden" value="label 1">
                                <input data-members-label="" type="hidden" value="label 2">
                                <div class="kg-signup-card-fields">
                                    <input class="kg-signup-card-input" id="email" data-members-email="" type="email" required="true" placeholder="jamie@example.com">
                                    <button class="kg-signup-card-button" style="background-color:#000000;color:#ffffff" type="submit">
                                        <span class="kg-signup-card-button-default">Button</span>
                                        <span class="kg-signup-card-button-loading">${loadingIcon}</span>
                                    </button>
                                </div>
                                <div class="kg-signup-card-success" style="color: #000000">Success!</div>
                                <div class="kg-signup-card-error" style="color: #000000" data-members-error=""></div>
                            </form>
                            <p class="kg-signup-card-disclaimer" style="color: #000000">Disclaimer</p>
                        </div>
                    </div>
                </div>
            `);
        });

        it(`doesn't apply the accent color class if there is a background image`, function () {
            const result = renderForWeb(getTestData({backgroundColor: 'accent', backgroundImageSrc: 'https://example.com/image.jpg'}));

            assertPrettifiesTo(result.html, html`
                <div class="kg-card kg-signup-card kg-width-regular" data-lexical-signup-form="" style="display:none">
                    <picture>
                        <img
                            class="kg-signup-card-image"
                            src="https://example.com/image.jpg"
                            alt=""
                        />
                    </picture>
                    <div class="kg-signup-card-content">
                        <div class="kg-signup-card-text kg-align-center">
                            <h2 class="kg-signup-card-heading" style="color: #000000">Header</h2>
                            <p class="kg-signup-card-subheading" style="color: #000000">Subheader</p>
                            <form class="kg-signup-card-form" data-members-form="signup">
                                <input data-members-label="" type="hidden" value="label 1">
                                <input data-members-label="" type="hidden" value="label 2">
                                <div class="kg-signup-card-fields">
                                    <input class="kg-signup-card-input" id="email" data-members-email="" type="email" required="true" placeholder="jamie@example.com">
                                    <button class="kg-signup-card-button" style="background-color: #000000; color:#ffffff" type="submit">
                                        <span class="kg-signup-card-button-default">Button</span>
                                        <span class="kg-signup-card-button-loading">${loadingIcon}</span>
                                    </button>
                                </div>
                                <div class="kg-signup-card-success" style="color: #000000">Success!</div>
                                <div class="kg-signup-card-error" style="color: #000000" data-members-error=""></div>
                            </form>
                            <p class="kg-signup-card-disclaimer" style="color: #000000">Disclaimer</p>
                        </div>
                    </div>
                </div>
            `);
        });
    });

    describe('email', function () {
        it('renders empty div in email', function () {
            const result = renderForEmail(getTestData());
            assert.equal(result.html, '<div></div>');
        });
    });
});
