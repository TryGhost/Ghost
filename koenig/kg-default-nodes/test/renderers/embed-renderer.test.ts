import assert from 'node:assert/strict';
import {assertPrettifiesTo, callRenderer, createDocument, html} from '../test-utils/index.js';

describe('renderers/embed-renderer', function () {
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

    function getTwitterTestData(overrides = {}) {
        return {
            url: 'https://twitter.com/ghost/status/1395670367216619520',
            embedType: 'twitter',
            html: '<blockquote class="twitter-tweet"><p lang="en" dir="ltr">Ghost 4.0 is out now! 🎉</p>&mdash; Ghost (@ghost) <a href="https://twitter.com/ghost/status/1395670367216619520?ref_src=twsrc%5Etfw">May 21, 2021</a></blockquote> <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>',
            metadata: {
                height: 500,
                provider_name: 'Twitter',
                provider_url: 'https://twitter.com',
                thumbnail_height: 150,
                thumbnail_url: 'https://pbs.twimg.com/media/E1Y1q3bXMAU7m4n?format=jpg&name=small',
                thumbnail_width: 150,
                title: 'Ghost on Twitter: "Ghost 4.0 is out now! 🎉"',
                type: 'rich',
                version: '1.0',
                width: 550
            },
            caption: 'caption text',
            ...overrides
        };
    }

    function renderForWeb(data: Record<string, unknown>, options?: Record<string, unknown>) {
        return callRenderer('embed', data, options);
    }

    function renderForEmail(data: Record<string, unknown>, options?: Record<string, unknown>) {
        return callRenderer('embed', data, {...options, target: 'email'});
    }

    describe('web', function () {
        it('matches snapshot for default test data', async function () {
            const result = renderForWeb(getTestData());

            assert.ok(result.html);

            await assertPrettifiesTo(result.html, html`
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

        it('renders a twitter embed without tweet_data', async function () {
            const result = renderForWeb(getTwitterTestData());

            await assertPrettifiesTo(result.html, html`
                <figure class="kg-card kg-embed-card kg-card-hascaption">
                    <blockquote class="twitter-tweet"><p lang="en" dir="ltr">Ghost 4.0 is out now! 🎉</p>— Ghost (@ghost) <a href="https://twitter.com/ghost/status/1395670367216619520?ref_src=twsrc%5Etfw">May 21, 2021</a></blockquote> <script async="" src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>
                    <figcaption>caption text</figcaption>
                </figure>
            `);
        });

        it('renders a twitter embed and ignores tweet_data', function () {
            const tweetData = {
                id: '1630581157568839683',
                created_at: '2023-02-28T14:50:17.000Z',
                author_id: '767545134',
                edit_history_tweet_ids: ['1630581157568839683'],
                public_metrics: {
                    retweet_count: 10,
                    reply_count: 2,
                    like_count: 38,
                    quote_count: 6,
                    impression_count: 10770
                },
                text: 'With the decline of traditional local news outlets, publishers like @MadisonMinutes, @RANGEMedia4all, and @sfsimplified are leading the charge in creating sustainable, community-driven journalism through websites and newsletters.\n' +
                    '\n' +
                    'Check out their impact 👇\n' +
                    'https://t.co/RdNNyY18Iv',
                lang: 'en',
                conversation_id: '1630581157568839683',
                possibly_sensitive: false,
                reply_settings: 'everyone'
            };

            const data = getTwitterTestData();
            (data.metadata as Record<string, unknown>).tweet_data = tweetData;

            const result = renderForWeb(data);

            assert.ok(result.html.includes('<blockquote class="twitter-tweet"'));
        });
    });

    describe('email', function () {
        it('matches snapshot for default test data', async function () {
            const result = renderForEmail(getTestData());

            assert.ok(result.html);

            await assertPrettifiesTo(result.html, html`
                <figure class="kg-card kg-embed-card">
                    <!--[if !mso !vml]-->
                    <a class="kg-video-preview" href="" aria-label="Play video" style="mso-hide: all">
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
                            href=""
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

        it('skips the video preview when thumbnail dimensions are missing', function () {
            const data = getTestData();
            delete (data.metadata as Record<string, unknown>).thumbnail_width;
            delete (data.metadata as Record<string, unknown>).thumbnail_height;

            const result = renderForEmail(data);

            assert.ok(!result.html.includes('kg-video-preview'));
            assert.ok(!result.html.includes('NaN'));
        });

        it('skips the video preview when thumbnail dimensions are not positive numbers', function () {
            const data = getTestData();
            (data.metadata as Record<string, unknown>).thumbnail_width = 'auto';
            (data.metadata as Record<string, unknown>).thumbnail_height = '0';

            const result = renderForEmail(data);

            assert.ok(!result.html.includes('kg-video-preview'));
            assert.ok(!result.html.includes('NaN'));
            assert.ok(!result.html.includes('Infinity'));
        });

        it('renders video preview URLs containing special characters', function () {
            const badUrl = 'https://example.org/a"b>c?x=1&y=<2>';
            const badThumbnail = 'https://example.org/it\'s "a" thumbnail.jpg';
            const data = getTestData({url: badUrl});
            data.metadata.thumbnail_url = badThumbnail;

            const result = renderForEmail(data);
            const doc = createDocument(result.html);
            const table = doc.querySelector('.kg-video-preview table');

            assert.equal(doc.querySelector('.kg-video-preview')?.getAttribute('href'), badUrl);
            assert.equal(table?.getAttribute('background'), badThumbnail);
            assert.equal(table?.getAttribute('style'), 'background: url(\'https://example.org/it%27s%20%22a%22%20thumbnail.jpg\') left top / cover; mso-hide: all');
            assert.ok(result.html.includes('href="https://example.org/a&quot;b&gt;c?x=1&amp;y=&lt;2&gt;" style="width:600px;'));
            assert.ok(result.html.includes('<v:fill src="https://example.org/it&#039;s &quot;a&quot; thumbnail.jpg" type="frame"/>'));
        });

        it('renders a twitter card with tweet_data', function () {
            const tweetData = {
                id: '1630581157568839683',
                created_at: '2023-02-28T14:50:17.000Z',
                author_id: '767545134',
                edit_history_tweet_ids: ['1630581157568839683'],
                public_metrics: {
                    retweet_count: 10,
                    reply_count: 2,
                    like_count: 38,
                    quote_count: 6,
                    impression_count: 10770
                },
                text: 'With the decline of traditional local news outlets, publishers like @MadisonMinutes, @RANGEMedia4all, and @sfsimplified are leading the charge in creating sustainable, community-driven journalism through websites and newsletters.\n' +
                    '\n' +
                    'Check out their impact 👇\n' +
                    'https://t.co/RdNNyY18Iv',
                lang: 'en',
                conversation_id: '1630581157568839683',
                possibly_sensitive: false,
                reply_settings: 'everyone',
                entities: {
                    mentions: [
                        {
                            start: 68,
                            end: 83,
                            username: 'MadisonMinutes',
                            id: '1371572739333632001'
                        },
                        {
                            start: 85,
                            end: 100,
                            username: 'RANGEMedia4all',
                            id: '1448389854207770627'
                        },
                        {
                            start: 106,
                            end: 119,
                            username: 'sfsimplified',
                            id: '1351509902548738048'
                        }
                    ]
                }
            };

            const data = getTwitterTestData();
            (data.metadata as Record<string, unknown>).tweet_data = tweetData;

            const result = renderForEmail(data);

            assert.ok(result.html.includes('<table cellspacing="0" cellpadding="0" border="0" class="kg-twitter-card">'));
            assert.ok(result.html.includes(`<a href="https://twitter.com/twitter/status/${tweetData.id}"`));
        });

        it('renders tweet values containing special characters', function () {
            const bad = '"Tom" <& Jerry>';
            const badName = 'Dr. <Who> & "Co"';
            const badUsername = 'who<&>"';
            const badUrl = 'https://example.org/a"b>c?x=1&y=<2>';
            const text = `Hello ${bad} &amp; @someone`;
            const data = getTwitterTestData();
            (data.metadata as Record<string, unknown>).tweet_data = {
                id: '1395670367216619520',
                author_id: '1',
                text,
                users: [{id: '1', name: badName, username: badUsername, profile_image_url: badUrl}],
                entities: {mentions: [{start: text.indexOf('@someone'), end: text.indexOf('@someone') + 7, username: 'someone'}]},
                attachments: {media_keys: ['1']},
                includes: {media: [{url: badUrl}]}
            };

            const result = renderForEmail(data);
            const doc = createDocument(result.html);
            const images = Array.from(doc.querySelectorAll('img')).map(img => img.getAttribute('src'));

            // Text Twitter sent already encoded shows as it would on Twitter
            assert.ok(doc.body.textContent?.includes(`Hello ${bad} & @someone`));
            assert.ok(doc.body.textContent?.includes(badName));
            assert.ok(doc.body.textContent?.includes(`@${badUsername}`));
            assert.equal(images.filter(src => src === badUrl).length, 2);
            assert.ok(Array.from(doc.querySelectorAll('span')).some(span => span.textContent === '@someone'));

            const links = Array.from(doc.querySelectorAll('a')).map(link => link.getAttribute('href'));
            assert.ok(links.length > 3);
            assert.deepEqual(new Set(links), new Set(['https://twitter.com/twitter/status/1395670367216619520']));
        });

        it('falls back to the original embed html when tweet_data.id is missing', function () {
            const result = renderForEmail(getTwitterTestData({
                metadata: {
                    tweet_data: {
                        text: 'tweet text without an id'
                    },
                    type: 'rich',
                    version: '1.0'
                }
            }));

            assert.ok(!result.html.includes('kg-twitter-card'));
            assert.ok(!result.html.includes('status/undefined'));
            assert.ok(result.html.includes('<blockquote class="twitter-tweet">'));
        });

        it('omits the timestamp when tweet_data.created_at is invalid', function () {
            const data = getTwitterTestData();
            (data.metadata as Record<string, unknown>).tweet_data = {
                id: '1630581157568839683',
                created_at: 'not-a-date',
                text: 'tweet text'
            };

            const result = renderForEmail(data);

            assert.ok(result.html.includes('kg-twitter-card'));
            assert.ok(!result.html.includes('Invalid DateTime'));
        });

        it('omits the image row when media_keys have no matching includes.media entry', function () {
            const data = getTwitterTestData();
            (data.metadata as Record<string, unknown>).tweet_data = {
                id: '1630581157568839683',
                created_at: '2023-02-28T14:50:17.000Z',
                text: 'tweet text',
                attachments: {media_keys: ['3_1630581153864273920']}
            };

            const result = renderForEmail(data);

            assert.ok(result.html.includes('kg-twitter-card'));
            assert.ok(!result.html.includes('src="null"'));
            assert.ok(!result.html.includes('src="undefined"'));
        });
    });
});
