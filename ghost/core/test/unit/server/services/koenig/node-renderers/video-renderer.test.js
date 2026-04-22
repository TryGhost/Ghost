const assert = require('node:assert/strict');
const {callRenderer, html, assertPrettifiesTo} = require('../test-utils');

describe('services/koenig/node-renderers/video-renderer', function () {
    function getTestData(overrides = {}) {
        return {
            src: '/content/images/2022/11/koenig-lexical.mp4',
            caption: 'This is a <b>caption</b>',
            fileName: 'koenig-lexical.mp4',
            mimeType: 'video/mp4',
            width: 200,
            height: 100,
            duration: 60,
            thumbnailSrc: '/content/images/2022/11/koenig-lexical.jpg',
            customThumbnailSrc: '/content/images/2022/11/koenig-lexical-custom.jpg',
            thumbnailWidth: 100,
            thumbnailHeight: 50,
            ...overrides
        };
    }

    function renderForWeb(data, options) {
        return callRenderer('video', data, options);
    }

    function renderForEmail(data, options) {
        return callRenderer('video', data, {...options, target: 'email'});
    }

    describe('web', function () {
        it('matches snapshot for default test data', function () {
            const result = renderForWeb(getTestData());

            assert.ok(result.html);

            assertPrettifiesTo(result.html, html`
                <figure class="kg-card kg-video-card kg-card-hascaption" data-kg-thumbnail="/content/images/2022/11/koenig-lexical.jpg" data-kg-custom-thumbnail="/content/images/2022/11/koenig-lexical-custom.jpg">
                    <div class="kg-video-container">
                        <video src="/content/images/2022/11/koenig-lexical.mp4" poster="https://img.spacergif.org/v1/200x100/0a/spacer.png" width="200" height="100" playsinline="" preload="metadata" style="background: transparent url('/content/images/2022/11/koenig-lexical-custom.jpg') 50% 50% / cover no-repeat;"></video>
                        <div class="kg-video-overlay">
                            <button class="kg-video-large-play-icon" aria-label="Play video">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                                    <path d="M23.14 10.608 2.253.164A1.559 1.559 0 0 0 0 1.557v20.887a1.558 1.558 0 0 0 2.253 1.392L23.14 13.393a1.557 1.557 0 0 0 0-2.785Z"></path>
                                </svg>
                            </button>
                        </div>
                        <div class="kg-video-player-container">
                            <div class="kg-video-player">
                                <button class="kg-video-play-icon" aria-label="Play video">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                                        <path d="M23.14 10.608 2.253.164A1.559 1.559 0 0 0 0 1.557v20.887a1.558 1.558 0 0 0 2.253 1.392L23.14 13.393a1.557 1.557 0 0 0 0-2.785Z"></path>
                                    </svg>
                                </button>
                                <button class="kg-video-pause-icon kg-video-hide" aria-label="Pause video">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                                        <rect x="3" y="1" width="7" height="22" rx="1.5" ry="1.5"></rect>
                                        <rect x="14" y="1" width="7" height="22" rx="1.5" ry="1.5"></rect>
                                    </svg>
                                </button>
                                <span class="kg-video-current-time">0:00</span>
                                <div class="kg-video-time">/<span class="kg-video-duration">undefined</span></div>
                                <input type="range" class="kg-video-seek-slider" max="100" value="0" />
                                <button class="kg-video-playback-rate" aria-label="Adjust playback speed">1×</button>
                                <button class="kg-video-unmute-icon" aria-label="Unmute">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                                        <path d="M15.189 2.021a9.728 9.728 0 0 0-7.924 4.85.249.249 0 0 1-.221.133H5.25a3 3 0 0 0-3 3v2a3 3 0 0 0 3 3h1.794a.249.249 0 0 1 .221.133 9.73 9.73 0 0 0 7.924 4.85h.06a1 1 0 0 0 1-1V3.02a1 1 0 0 0-1.06-.998Z"></path>
                                    </svg>
                                </button>
                                <button class="kg-video-mute-icon kg-video-hide" aria-label="Mute">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                                        <path d="M16.177 4.3a.248.248 0 0 0 .073-.176v-1.1a1 1 0 0 0-1.061-1 9.728 9.728 0 0 0-7.924 4.85.249.249 0 0 1-.221.133H5.25a3 3 0 0 0-3 3v2a3 3 0 0 0 3 3h.114a.251.251 0 0 0 .177-.073ZM23.707 1.706A1 1 0 0 0 22.293.292l-22 22a1 1 0 0 0 0 1.414l.009.009a1 1 0 0 0 1.405-.009l6.63-6.631A.251.251 0 0 1 8.515 17a.245.245 0 0 1 .177.075 10.081 10.081 0 0 0 6.5 2.92 1 1 0 0 0 1.061-1V9.266a.247.247 0 0 1 .073-.176Z"></path>
                                    </svg>
                                </button>
                                <input type="range" class="kg-video-volume-slider" max="100" value="100" />
                            </div>
                        </div>
                    </div>
                    <figcaption>This is a <b>caption</b></figcaption>
                </figure>
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
                <figure class="kg-card kg-video-card kg-card-hascaption">
                    <!--[if !mso !vml]-->
                    <a class="kg-video-preview" href="https://test.com/post/" aria-label="Play video" style="mso-hide: all">
                        <table cellpadding="0" cellspacing="0" border="0" width="100%" background="/content/images/2022/11/koenig-lexical-custom.jpg" role="presentation" style="background: url('/content/images/2022/11/koenig-lexical-custom.jpg') left top / cover; mso-hide: all;">
                            <tbody>
                                <tr style="mso-hide: all">
                                    <td width="25%" style="visibility: hidden; mso-hide: all">
                                        <img src="https://img.spacergif.org/v1/150x300/0a/spacer.png" alt="" width="100%" border="0" style="display: block; height: auto; opacity: 0; visibility: hidden; mso-hide: all;" />
                                    </td>
                                    <td width="50%" align="center" valign="middle" style="vertical-align: middle; mso-hide: all">
                                        <div class="kg-video-play-button" style="mso-hide: all">
                                            <div style="mso-hide: all"></div>
                                        </div>
                                    </td>
                                    <td width="25%" style="mso-hide: all">&nbsp;</td>
                                </tr>
                            </tbody>
                        </table>
                    </a>
                    <!--[endif]-->

                    <!--[if vml]>
                    <v:group xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" coordsize="600,300" coordorigin="0,0" href="https://test.com/post/" style="width: 600px; height: 300px">
                        <v:rect fill="t" stroked="f" style="position: absolute; width: 600; height: 300"><v:fill src="/content/images/2022/11/koenig-lexical-custom.jpg" type="frame" /></v:rect>
                        <v:oval fill="t" strokecolor="white" strokeweight="4px" style="position: absolute; left: 261; top: 111; width: 78; height: 78"><v:fill color="black" opacity="30%" /></v:oval>
                        <v:shape coordsize="24,32" path="m,l,32,24,16,xe" fillcolor="white" stroked="f" style="position: absolute; left: 289; top: 133; width: 30; height: 34" />
                    </v:group>
                    <![endif]-->

                    <figcaption>This is a<b>caption</b></figcaption>
                </figure>
            `);
        });

        it('renders nothing with a missing src', function () {
            const result = renderForEmail(getTestData({src: ''}));
            assert.equal(result.html, '');
        });
    });
});
