const assert = require('node:assert/strict');
const {callRenderer, html, assertPrettifiesTo} = require('../test-utils');

describe('koenig/services/node-renderers/audio-renderer', function () {
    function getTestData(overrides = {}) {
        return {
            src: '/content/audio/2022/11/koenig-lexical.mp3',
            title: 'Test Audio',
            duration: 60,
            mimeType: 'audio/mp3',
            thumbnailSrc: '/content/images/2022/11/koenig-audio-lexical.jpg',
            ...overrides
        };
    }

    function renderForWeb(data, options) {
        return callRenderer('audio', data, options);
    }

    function renderForEmail(data, options) {
        return callRenderer('audio', data, {...options, target: 'email'});
    }

    describe('web', function () {
        it('matches snapshot for default test data', function () {
            const result = renderForWeb(getTestData());

            assert.ok(result.html);

            assertPrettifiesTo(result.html, html`
                <div class="kg-card kg-audio-card">
                    <img src="/content/images/2022/11/koenig-audio-lexical.jpg" alt="audio-thumbnail" class="kg-audio-thumbnail">
                    <div class="kg-audio-thumbnail placeholder kg-audio-hide">
                        <svg width="24" height="24" fill="none">
                            <path fill-rule="evenodd" clip-rule="evenodd" d="M7.5 15.33a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm-2.25.75a2.25 2.25 0 1 1 4.5 0 2.25 2.25 0 0 1-4.5 0ZM15 13.83a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm-2.25.75a2.25 2.25 0 1 1 4.5 0 2.25 2.25 0 0 1-4.5 0Z"></path>
                            <path fill-rule="evenodd" clip-rule="evenodd" d="M14.486 6.81A2.25 2.25 0 0 1 17.25 9v5.579a.75.75 0 0 1-1.5 0v-5.58a.75.75 0 0 0-.932-.727.755.755 0 0 1-.059.013l-4.465.744a.75.75 0 0 0-.544.72v6.33a.75.75 0 0 1-1.5 0v-6.33a2.25 2.25 0 0 1 1.763-2.194l4.473-.746Z"></path>
                            <path fill-rule="evenodd" clip-rule="evenodd" d="M3 1.5a.75.75 0 0 0-.75.75v19.5a.75.75 0 0 0 .75.75h18a.75.75 0 0 0 .75-.75V5.133a.75.75 0 0 0-.225-.535l-.002-.002-3-2.883A.75.75 0 0 0 18 1.5H3ZM1.409.659A2.25 2.25 0 0 1 3 0h15a2.25 2.25 0 0 1 1.568.637l.003.002 3 2.883a2.25 2.25 0 0 1 .679 1.61V21.75A2.25 2.25 0 0 1 21 24H3a2.25 2.25 0 0 1-2.25-2.25V2.25c0-.597.237-1.169.659-1.591Z"></path>
                        </svg>
                    </div>
                    <div class="kg-audio-player-container">
                        <audio src="/content/audio/2022/11/koenig-lexical.mp3" preload="metadata"></audio>
                        <div class="kg-audio-title">Test Audio</div>
                        <div class="kg-audio-player">
                            <button class="kg-audio-play-icon" aria-label="Play audio">
                                <svg viewBox="0 0 24 24">
                                    <path d="M23.14 10.608 2.253.164A1.559 1.559 0 0 0 0 1.557v20.887a1.558 1.558 0 0 0 2.253 1.392L23.14 13.393a1.557 1.557 0 0 0 0-2.785Z"></path>
                                </svg>
                            </button>
                            <button class="kg-audio-pause-icon kg-audio-hide" aria-label="Pause audio">
                                <svg viewBox="0 0 24 24">
                                    <rect x="3" y="1" width="7" height="22" rx="1.5" ry="1.5"></rect>
                                    <rect x="14" y="1" width="7" height="22" rx="1.5" ry="1.5"></rect>
                                </svg>
                            </button>
                            <span class="kg-audio-current-time">0:00</span>
                            <div class="kg-audio-time">/<span class="kg-audio-duration">60</span></div>
                            <input type="range" class="kg-audio-seek-slider" max="100" value="0">
                            <button class="kg-audio-playback-rate" aria-label="Adjust playback speed">1×</button>
                            <button class="kg-audio-unmute-icon" aria-label="Unmute">
                                <svg viewBox="0 0 24 24">
                                    <path d="M15.189 2.021a9.728 9.728 0 0 0-7.924 4.85.249.249 0 0 1-.221.133H5.25a3 3 0 0 0-3 3v2a3 3 0 0 0 3 3h1.794a.249.249 0 0 1 .221.133 9.73 9.73 0 0 0 7.924 4.85h.06a1 1 0 0 0 1-1V3.02a1 1 0 0 0-1.06-.998Z"></path>
                                </svg>
                            </button>
                            <button class="kg-audio-mute-icon kg-audio-hide" aria-label="Mute">
                                <svg viewBox="0 0 24 24">
                                    <path d="M16.177 4.3a.248.248 0 0 0 .073-.176v-1.1a1 1 0 0 0-1.061-1 9.728 9.728 0 0 0-7.924 4.85.249.249 0 0 1-.221.133H5.25a3 3 0 0 0-3 3v2a3 3 0 0 0 3 3h.114a.251.251 0 0 0 .177-.073ZM23.707 1.706A1 1 0 0 0 22.293.292l-22 22a1 1 0 0 0 0 1.414l.009.009a1 1 0 0 0 1.405-.009l6.63-6.631A.251.251 0 0 1 8.515 17a.245.245 0 0 1 .177.075 10.081 10.081 0 0 0 6.5 2.92 1 1 0 0 0 1.061-1V9.266a.247.247 0 0 1 .073-.176Z"></path>
                                </svg>
                            </button>
                            <input type="range" class="kg-audio-volume-slider" max="100" value="100">
                        </div>
                    </div>
                </div>
            `);
        });

        it('renders nothing with a missing src', function () {
            const result = renderForWeb(getTestData({src: ''}));
            assert.equal(result.html, '');
        });
    });

    describe('email', function () {
        it('matches snapshot for default test data', function () {
            const result = renderForEmail(getTestData());

            assert.ok(result.html);

            assertPrettifiesTo(result.html, html`
                <table cellspacing="0" cellpadding="0" border="0" class="kg-audio-card">
                    <tbody>
                        <tr>
                            <td>
                                <table cellspacing="0" cellpadding="0" border="0" width="100%">
                                    <tbody>
                                        <tr>
                                            <td width="60">
                                                <a href="https://test.com/post/" style="display: block; width: 60px; height: 60px; padding-top: 4px; padding-right: 16px; padding-bottom: 4px; padding-left: 4px; border-radius: 2px;">
                                                    <img src="/content/images/2022/11/koenig-audio-lexical.jpg" class="kg-audio-thumbnail" style="width: 60px; height: 60px; object-fit: cover; border: 0; border-radius: 2px;">
                                                </a>
                                            </td>
                                            <td style="position: relative; vertical-align: center" valign="middle">
                                                <a href="https://test.com/post/" style="position: absolute; display: block; top: 0; right: 0; bottom: 0; left: 0;"></a>
                                                <table cellspacing="0" cellpadding="0" border="0" width="100%">
                                                    <tbody>
                                                        <tr>
                                                            <td>
                                                                <a href="https://test.com/post/" class="kg-audio-title">Test Audio</a>
                                                            </td>
                                                        </tr>
                                                        <tr>
                                                            <td>
                                                                <table cellspacing="0" cellpadding="0" border="0" width="100%">
                                                                    <tbody>
                                                                        <tr>
                                                                            <td width="24" style="vertical-align: middle" valign="middle">
                                                                                <a href="https://test.com/post/" class="kg-audio-play-button"></a>
                                                                            </td>
                                                                            <td style="vertical-align: middle" valign="middle">
                                                                                <a href="https://test.com/post/" class="kg-audio-duration">1:00<span class="kg-audio-link">• Click to play audio</span></a>
                                                                            </td>
                                                                        </tr>
                                                                    </tbody>
                                                                </table>
                                                            </td>
                                                        </tr>
                                                    </tbody>
                                                </table>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </td>
                        </tr>
                    </tbody>
                </table>
            `);
        });

        it('renders nothing with a missing src', function () {
            const result = renderForEmail(getTestData({src: ''}));
            assert.equal(result.html, '');
        });
    });
});
