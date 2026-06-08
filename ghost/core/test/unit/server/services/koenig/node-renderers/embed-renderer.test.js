const assert = require('node:assert/strict');
const {callRenderer, html, assertPrettifiesTo} = require('../test-utils');

describe('services/koenig/node-renderers/embed-renderer', function () {
    function getTestData(overrides = {}) {
        return {
            isEmpty: () => false,
            html: '<iframe width="200" height="113" src="https://www.youtube.com/embed/7hCPODjJO7s?feature=oembed" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen title="Project Binky - Episode 1  - Austin Mini GT-Four - Turbo Charged 4WD Mini"></iframe>',
            metadata: {
                author_name: 'Bad Obsession Motorsport',
                author_url: 'https://www.youtube.com/@BadObsessionMotorsport',
                height: 113,
                provider_name: 'YouTube',
                provider_url: 'https://www.youtube.com/',
                thumbnail_height: 360,
                thumbnail_url: 'https://i.ytimg.com/vi/7hCPODjJO7s/hqdefault.jpg',
                thumbnail_width: '480',
                title: 'Project Binky - Episode 1  - Austin Mini GT-Four - Turbo Charged 4WD Mini',
                version: '1.0',
                width: 200
            },
            embedType: 'video',
            ...overrides
        };
    }

    function renderForWeb(data, options) {
        return callRenderer('embed', data, options);
    }

    function renderForEmail(data, options) {
        return callRenderer('embed', data, {...options, target: 'email'});
    }

    describe('web', function () {
        it('matches snapshot for default test data', function () {
            const result = renderForWeb(getTestData());

            assert.ok(result.html);

            assertPrettifiesTo(result.html, html`
                <figure class="kg-card kg-embed-card">
                    <iframe
                        width="200"
                        height="113"
                        src="https://www.youtube.com/embed/7hCPODjJO7s?feature=oembed"
                        frameborder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowfullscreen=""
                        title="Project Binky - Episode 1  - Austin Mini GT-Four - Turbo Charged 4WD Mini"
                    ></iframe>
                </figure>
            `);
        });

        it('renders nothing with missing data', function () {
            const result = renderForWeb(getTestData({isEmpty: () => true}));
            assert.equal(result.html, '');
        });
    });

    describe('email', function () {
        it('matches snapshot for default test data', function () {
            const result = renderForEmail(getTestData());

            assert.ok(result.html);

            assertPrettifiesTo(result.html, html`
                <figure class="kg-card kg-embed-card">
                    <!--[if !mso !vml]-->
                    <a class="kg-video-preview" href="undefined" aria-label="Play video" style="mso-hide: all">
                        <table
                            cellpadding="0"
                            cellspacing="0"
                            border="0"
                            width="100%"
                            background="https://i.ytimg.com/vi/7hCPODjJO7s/hqdefault.jpg"
                            role="presentation"
                            style="
                                background: url('https://i.ytimg.com/vi/7hCPODjJO7s/hqdefault.jpg') left top / cover;
                                mso-hide: all;
                            "
                        >
                            <tbody>
                                <tr style="mso-hide: all">
                                    <td width="25%" style="visibility: hidden; mso-hide: all">
                                        <img
                                            src="https://img.spacergif.org/v1/150x450/0a/spacer.png"
                                            alt=""
                                            width="100%"
                                            border="0"
                                            style="
                                                display: block;
                                                height: auto;
                                                opacity: 0;
                                                visibility: hidden;
                                                mso-hide: all;
                                            "
                                        />
                                    </td>
                                    <td width="50%" align="center" valign="middle" style="vertical-align: middle; mso-hide: all">
                                        <div class="kg-video-play-button" style="mso-hide: all">
                                            <div style="mso-hide: all"></div>
                                        </div>
                                    </td>
                                    <td width="25%" style="mso-hide: all">
                                        &nbsp;
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </a>
                    <!--[endif]-->
                    <!--[if vml]>
                        <v:group
                            xmlns:v="urn:schemas-microsoft-com:vml"
                            xmlns:w="urn:schemas-microsoft-com:office:word"
                            coordsize="600,450"
                            coordorigin="0,0"
                            href="undefined"
                            style="width: 600px; height: 450px"
                        >
                            <v:rect
                                fill="t"
                                stroked="f"
                                style="position: absolute; width: 600; height: 450"
                                ><v:fill
                                    src="https://i.ytimg.com/vi/7hCPODjJO7s/hqdefault.jpg"
                                    type="frame"
                            /></v:rect>
                            <v:oval
                                fill="t"
                                strokecolor="white"
                                strokeweight="4px"
                                style="position: absolute; left: 261; top: 186; width: 78; height: 78"
                                ><v:fill color="black" opacity="30%"
                            /></v:oval>
                            <v:shape
                                coordsize="24,32"
                                path="m,l,32,24,16,xe"
                                fillcolor="white"
                                stroked="f"
                                style="position: absolute; left: 289; top: 208; width: 30; height: 34"
                            />
                        </v:group>
                    <![endif]-->
                </figure>
            `);
        });

        it('renders nothing with a missing data', function () {
            const result = renderForEmail(getTestData({isEmpty: () => true}));
            assert.equal(result.html, '');
        });
    });
});
