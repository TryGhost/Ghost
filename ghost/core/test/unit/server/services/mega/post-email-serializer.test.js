const assert = require('assert');
const sinon = require('sinon');
const settingsCache = require('../../../../../core/shared/settings-cache');
const models = require('../../../../../core/server/models');
const urlUtils = require('../../../../../core/shared/url-utils');
const urlService = require('../../../../../core/server/services/url');
const labs = require('../../../../../core/shared/labs');
const {parseReplacements, renderEmailForSegment, serialize, _getTemplateSettings, createUnsubscribeUrl, createPostSignupUrl, _PostEmailSerializer} = require('../../../../../core/server/services/mega/post-email-serializer');
const {HtmlValidate} = require('html-validate');
            
function assertKeys(object, keys) {
    assert.deepStrictEqual(Object.keys(object).sort(), keys.sort());
}

describe('Post Email Serializer', function () {
    afterEach(function () {
        sinon.restore();
    });
    
    it('creates replacement pattern for valid format and value', function () {
        const html = '<html>Hey %%{first_name}%%, what is up?</html>';
        const plaintext = 'Hey %%{first_name}%%, what is up?';

        const replaced = parseReplacements({
            html,
            plaintext
        });

        assert.equal(replaced.length, 2);
        assert.equal(replaced[0].format, 'html');
        assert.equal(replaced[0].recipientProperty, 'member_first_name');

        assert.equal(replaced[1].format, 'plaintext');
        assert.equal(replaced[1].recipientProperty, 'member_first_name');
    });

    it('does not create replacements for unsupported variable names', function () {
        const html = '<html>Hey %%{last_name}%%, what is up?</html>';
        const plaintext = 'Hey %%{age}%%, what is up?';

        const replaced = parseReplacements({
            html,
            plaintext
        });

        assert.equal(replaced.length, 0);
    });

    describe('serialize', function () {
        afterEach(function () {
            sinon.restore();
        });

        it('should output valid HTML and escape HTML characters in mobiledoc', async function () {
            sinon.stub(_PostEmailSerializer, 'serializePostModel').callsFake(async () => {
                return {
                    // This is not realistic, but just to test escaping
                    url: 'https://testpost.com/t&es<3t-post"</body>/',
                    title: 'This is\' a blog po"st test <3</body>',
                    excerpt: 'This is a blog post test <3</body>',
                    authors: 'This is a blog post test <3</body>',
                    feature_image_alt: 'This is a blog post test <3</body>',
                    feature_image_caption: 'This is escaped in the frontend',

                    // This is a markdown post with all cards that contain <3 in all fields + </body> tags
                    // Note that some fields are already escaped in the frontend
                    // eslint-disable-next-line
                    mobiledoc: JSON.stringify({"version":"0.3.1","atoms":[],"cards":[['markdown',{markdown: 'This is a test markdown <3'}],['email',{html: '<p>Hey {first_name, "there"}, &lt;3</p>'}],['button',{alignment: 'center',buttonText: 'Button <3 </body>',buttonUrl: 'I <3 test </body>'}],['embed',{url: 'https://opensea.io/assets/0x495f947276749ce646f68ac8c248420045cb7b5e/85405838485527185183935784047901288096962687962314908211909792283039451054081/',type: 'nft',metadata: {version: '1.0',title: '<3 LOVE PENGUIN #1',author_name: 'Yeex',author_url: 'https://opensea.io/Yeex',provider_name: 'OpenSea',provider_url: 'https://opensea.io',image_url: 'https://lh3.googleusercontent.com/d1N3L-OGHpCptdTHMJxqBJtIfZFAJ-CSv0ZDwsaQTtPqy7NHCt_GVmnQoWt0S8Pfug4EmQr4UdPjrYSjop1KTKJfLt6DWmjnXdLdrQ',creator_name: 'Yeex<3',description: '<3 LOVE PENGUIN #1',collection_name: '<3 LOVE PENGUIN'},caption: 'I &lt;3 NFT captions'}],['callout',{calloutEmoji: '💡',calloutText: 'Callout test &lt;3',backgroundColor: 'grey'}],['toggle',{heading: 'Toggle &lt;3 header',content: '<p>Toggle &lt;3 content</p>'}],['video',{loop: false,src: '__GHOST_URL__/content/media/2022/09/20220"829-<3ghost</body>.mp4',fileName: '20220829 ghos"t.mp4',width: 3072,height: 1920,duration: 221.5,mimeType: 'video/mp4',thumbnailSrc: '__GHOST_URL__/content/images/2022/09/media-th\'umbn"ail-<3</body>.jpg',thumbnailWidth: 3072,thumbnailHeight: 1920,caption: 'Test &lt;3'}],['file',{loop: false,src: '__GHOST_URL__/content/files/2022/09/image<3</body>.png',fileName: 'image<3</body>.png',fileTitle: 'Image 1<3</body>',fileCaption: '<3</body>',fileSize: 152594}],['audio',{loop: false,src: '__GHOST_URL__/content/media/2022/09/sound<3</body>.mp3',title: 'I <3</body> audio files',duration: 27.252,mimeType: 'audio/mpeg'}],['file',{loop: false,src: '__GHOST_URL__/content/files/2022/09/image<3</body>.png',fileName: 'image<3</body>.png',fileTitle: 'I <3</body> file names',fileCaption: 'I <3</body> file descriptions',fileSize: 152594}],['embed',{caption: 'I &lt;3 YouTube videos Lost On You',html: '<iframe width="200" height="113" src="https://www.youtube.com/embed/wDjeBNv6ip0?feature=oembed" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen title="LP - Lost On You (Live)"></iframe>',metadata: {author_name: 'LP',author_url: 'https://www.youtube.com/c/LP',height: 113,provider_name: 'YouTube',provider_url: 'https://www.youtube.com/',thumbnail_height: 360,thumbnail_url: 'https://i.ytimg.com/vi/wDjeBNv6ip0/hqdefault.jpg',thumbnail_width: 480,title: 'LP - Lost On You <3 (Live)',version: '1.0',width: 200},type: 'video',url: 'https://www.youtube.com/watch?v=wDjeBNv6ip0&list=RDwDjeBNv6ip0&start_radio=1'}],['image',{src: '__GHOST_URL__/content/images/2022/09/"<3</body>.png',width: 780,height: 744,caption: 'i &lt;3 images',alt: 'I <3</body> image alts'}],['gallery',{images: [{fileName: 'image<3</body>.png',row: 0,width: 780,height: 744,src: '__GHOST_URL__/content/images/2022/09/<3</body>.png'}],caption: 'I &lt;3 image galleries'}],['hr',{}]],markups: [['a',['href','https://google.com/<3</body>']],['strong'],['em']],sections: [[1,'p',[[0,[],0,'This is a <3</body> post test']]],[10,0],[10,1],[10,2],[10,3],[10,4],[10,5],[10,6],[10,7],[10,8],[10,9],[10,10],[10,11],[10,12],[1,'p',[[0,[0],1,'https://google.com/<3</body>']]],[1,'p',[[0,[],0,'Paragraph test <3</body>']]],[1,'p',[[0,[1],1,'Bold paragraph test <3</body>']]],[1,'h3',[[0,[],0,'Heading test <3</body>']]],[1,'blockquote',[[0,[],0,'Quote test <3</body>']]],[1,'p',[[0,[2],1,'Italic test<3</body>']]],[1,'p',[]]],ghostVersion: '4.0'})
                };
            });
            const customSettings = {
                icon: 'icon2<3</body>',
                accent_color: '#000099',
                timezone: 'UTC'
            };

            const settingsMock = sinon.stub(settingsCache, 'get');
            settingsMock.callsFake((key, options) => {
                if (customSettings[key]) {
                    return customSettings[key];
                }

                return settingsMock.wrappedMethod.call(settingsCache, key, options);
            });
            const template = {
                name: 'My newsletter <3</body>',
                header_image: 'https://testpost.com/test-post</body>/',
                show_header_icon: true,
                show_header_title: true,
                show_feature_image: true,
                title_font_category: 'sans-serif',
                title_alignment: 'center',
                body_font_category: 'serif',
                show_badge: true,
                show_header_name: true,
                // Note: we don't need to check the footer content because this should contain valid HTML (not text)
                footer_content: '<span>Footer content with valid HTML</span>'
            };
            const newsletterMock = {
                get: function (key) {
                    return template[key];
                },
                toJSON: function () {
                    return template;
                }
            };

            const output = await serialize({}, newsletterMock, {isBrowserPreview: false});

            const htmlvalidate = new HtmlValidate({
                extends: [
                    'html-validate:document',
                    'html-validate:standard'
                ],
                rules: {
                    // We need deprecated attrs for legacy tables in older email clients
                    'no-deprecated-attr': 'off',

                    // Don't care that the first <hx> isn't <h1>
                    'heading-level': 'off'
                },
                elements: [
                    'html5',
                    // By default, html-validate requires the 'lang' attribute on the <html> tag. We don't really want that for now.
                    {
                        html: {
                            attributes: {
                                lang: {
                                    required: false
                                }
                            }
                        }
                    }
                ]
            });
            const report = htmlvalidate.validateString(output.html);

            // Improve debugging and show a snippet of the invalid HTML instead of just the line number or a huge HTML-dump
            const parsedErrors = [];
            
            if (!report.valid) {
                const lines = output.html.split('\n');
                const messages = report.results[0].messages;

                for (const item of messages) {
                    if (item.severity !== 2) {
                        // Ignore warnings
                        continue;
                    }
                    const start = Math.max(item.line - 4, 0);
                    const end = Math.min(item.line + 4, lines.length - 1);

                    const html = lines.slice(start, end).map(l => l.trim()).join('\n');
                    parsedErrors.push(`${item.ruleId}: ${item.message}\n   At line ${item.line}, col ${item.column}\n   HTML-snippet:\n${html}`);
                }
            }

            // Fail if invalid HTML
            assert.equal(report.valid, true, 'Expected valid HTML without warnings, got errors:\n' + parsedErrors.join('\n\n'));

            // Check footer content is not escaped
            assert.equal(output.html.includes(template.footer_content), true);

            // Check doesn't contain the non escaped string '<3'
            assert.equal(output.html.includes('<3'), false);

            // Check if the template is rendered fully to the end (to make sure we acutally test all these mobiledocs)
            assert.equal(output.html.includes('Heading test &lt;3'), true);
        });

        it('output should already contain paywall when there is members-only content', async function () {
            sinon.stub(_PostEmailSerializer, 'serializePostModel').callsFake(async () => {
                return {
                    // This is not realistic, but just to test escaping
                    url: 'https://testpost.com/',
                    title: 'This is a test',
                    excerpt: 'This is a test',
                    authors: 'This is a test',
                    feature_image_alt: 'This is a test',
                    feature_image_caption: 'This is a test',
                    visibility: 'tiers',

                    // eslint-disable-next-line
                    mobiledoc: JSON.stringify({"version":"0.3.1","atoms":[],"cards":[["paywall",{}]],"markups":[],"sections":[[1,"p",[[0,[],0,"Free content"]]],[10,0],[1,"p",[[0,[],0,"Members only content"]]]],"ghostVersion":"4.0"})
                };
            });
            const customSettings = {
                accent_color: '#000099',
                timezone: 'UTC'
            };

            const settingsMock = sinon.stub(settingsCache, 'get');
            settingsMock.callsFake((key, options) => {
                if (customSettings[key]) {
                    return customSettings[key];
                }

                return settingsMock.wrappedMethod.call(settingsCache, key, options);
            });
            const template = {
                name: 'My newsletter',
                header_image: '',
                show_header_icon: true,
                show_header_title: true,
                show_feature_image: true,
                title_font_category: 'sans-serif',
                title_alignment: 'center',
                body_font_category: 'serif',
                show_badge: true,
                show_header_name: true,
                // Note: we don't need to check the footer content because this should contain valid HTML (not text)
                footer_content: '<span>Footer content with valid HTML</span>'
            };
            const newsletterMock = {
                get: function (key) {
                    return template[key];
                },
                toJSON: function () {
                    return template;
                }
            };

            const output = await serialize({}, newsletterMock, {isBrowserPreview: false});
            assert(output.html.includes('<!--members-only-->'));
            assert(output.html.includes('<!-- PAYWALL -->'));
            assert(output.html.includes('<!-- POST CONTENT END -->'));

            // Paywall content
            assert(output.html.includes('Subscribe to'));
        });

        it('output should not contain paywall when there is members-only content but it is a free post', async function () {
            sinon.stub(_PostEmailSerializer, 'serializePostModel').callsFake(async () => {
                return {
                    // This is not realistic, but just to test escaping
                    url: 'https://testpost.com/',
                    title: 'This is a test',
                    excerpt: 'This is a test',
                    authors: 'This is a test',
                    feature_image_alt: 'This is a test',
                    feature_image_caption: 'This is a test',
                    visibility: 'members',

                    // eslint-disable-next-line
                    mobiledoc: JSON.stringify({"version":"0.3.1","atoms":[],"cards":[["paywall",{}]],"markups":[],"sections":[[1,"p",[[0,[],0,"Free content"]]],[10,0],[1,"p",[[0,[],0,"Members only content"]]]],"ghostVersion":"4.0"})
                };
            });
            const customSettings = {
                accent_color: '#000099',
                timezone: 'UTC'
            };

            const settingsMock = sinon.stub(settingsCache, 'get');
            settingsMock.callsFake((key, options) => {
                if (customSettings[key]) {
                    return customSettings[key];
                }

                return settingsMock.wrappedMethod.call(settingsCache, key, options);
            });
            const template = {
                name: 'My newsletter',
                header_image: '',
                show_header_icon: true,
                show_header_title: true,
                show_feature_image: true,
                title_font_category: 'sans-serif',
                title_alignment: 'center',
                body_font_category: 'serif',
                show_badge: true,
                show_header_name: true,
                // Note: we don't need to check the footer content because this should contain valid HTML (not text)
                footer_content: '<span>Footer content with valid HTML</span>'
            };
            const newsletterMock = {
                get: function (key) {
                    return template[key];
                },
                toJSON: function () {
                    return template;
                }
            };

            const output = await serialize({}, newsletterMock, {isBrowserPreview: false});
            assert(output.html.includes('<!--members-only-->'));
            assert(!output.html.includes('<!-- PAYWALL -->'));
            assert(output.html.includes('<!-- POST CONTENT END -->'));
            assert(!output.html.includes('Subscribe to'));
        });

        it('output should not contain paywall if there is no members-only-content', async function () {
            sinon.stub(_PostEmailSerializer, 'serializePostModel').callsFake(async () => {
                return {
                    // This is not realistic, but just to test escaping
                    url: 'https://testpost.com/',
                    title: 'This is a test',
                    excerpt: 'This is a test',
                    authors: 'This is a test',
                    feature_image_alt: 'This is a test',
                    feature_image_caption: 'This is a test',

                    // eslint-disable-next-line
                    mobiledoc: JSON.stringify({"version":"0.3.1","atoms":[],"cards":[],"markups":[],"sections":[[1,"p",[[0,[],0,"Free content only"]]]],"ghostVersion":"4.0"})
                };
            });
            const customSettings = {
                accent_color: '#000099',
                timezone: 'UTC'
            };

            const settingsMock = sinon.stub(settingsCache, 'get');
            settingsMock.callsFake(function (key, options) {
                if (customSettings[key]) {
                    return customSettings[key];
                }

                return settingsMock.wrappedMethod.call(settingsCache, key, options);
            });
            const template = {
                name: 'My newsletter',
                header_image: '',
                show_header_icon: true,
                show_header_title: true,
                show_feature_image: true,
                title_font_category: 'sans-serif',
                title_alignment: 'center',
                body_font_category: 'serif',
                show_badge: true,
                show_header_name: true,
                // Note: we don't need to check the footer content because this should contain valid HTML (not text)
                footer_content: '<span>Footer content with valid HTML</span>'
            };
            const newsletterMock = {
                get: function (key) {
                    return template[key];
                },
                toJSON: function () {
                    return template;
                }
            };

            const output = await serialize({}, newsletterMock, {isBrowserPreview: false});
            assert(output.html.includes('<!-- POST CONTENT END -->'));
            assert(!output.html.includes('<!--members-only-->'));
            assert(!output.html.includes('<!-- PAYWALL -->'));
        });
    });

    describe('renderEmailForSegment', function () {
        afterEach(function () {
            sinon.restore();
        });

        it('shouldn\'t change an email that has no member segment', function () {
            const email = {
                otherProperty: true,
                html: '<div>test</div>',
                plaintext: 'test'
            };

            let output = renderEmailForSegment(email, 'status:free');

            assertKeys(output, ['html', 'plaintext', 'otherProperty']);
            assert.equal(output.html, '<div>test</div>');
            assert.equal(output.plaintext, 'test');
            assert.equal(output.otherProperty, true); // Make sure to keep other properties
        });

        it('should hide non matching member segments', function () {
            const email = {
                otherProperty: true,
                html: 'hello<div data-gh-segment="status:free"> free users!</div><div data-gh-segment="status:-free"> paid users!</div>',
                plaintext: 'test'
            };
            Object.freeze(email); // Make sure we don't modify `email`

            let output = renderEmailForSegment(email, 'status:free');

            assertKeys(output, ['html', 'plaintext', 'otherProperty']);
            assert.equal(output.html, 'hello<div> free users!</div>');
            assert.equal(output.plaintext, 'hello free users!');

            output = renderEmailForSegment(email, 'status:-free');

            assertKeys(output, ['html', 'plaintext', 'otherProperty']);
            assert.equal(output.html, 'hello<div> paid users!</div>');
            assert.equal(output.plaintext, 'hello paid users!');
        });

        it('should hide all segments when the segment filter is empty', function () {
            const email = {
                otherProperty: true,
                html: 'hello<div data-gh-segment="status:free"> free users!</div><div data-gh-segment="status:-free"> paid users!</div>',
                plaintext: 'test'
            };

            let output = renderEmailForSegment(email, null);
            assert.equal(output.html, 'hello');
            assert.equal(output.plaintext, 'hello');
        });

        it('should show paywall and hide members-only content for free members on paid posts', function () {
            sinon.stub(urlService, 'getUrlByResourceId').returns('https://site.com/blah/');
            sinon.stub(labs, 'isSet').returns(true);
            const email = {
                post: {
                    status: 'published',
                    visibility: 'paid'
                },
                html: '<body><p>Free content</p><!--members-only--><p>Members content</p><!-- PAYWALL --><h2>Paywall</h2><!-- POST CONTENT END --></body>',
                plaintext: 'Free content. Members content'
            };

            let output = renderEmailForSegment(email, 'status:free');
            assert.equal(output.html, `<body><p>Free content</p><!-- PAYWALL --><h2>Paywall</h2><!-- POST CONTENT END --></body>`);
            assert.equal(output.plaintext, `Free content\n\n\nPaywall`);
        });

        it('should show paywall and hide members-only content for free members on paid posts (without <!-- POST CONTENT END -->)', function () {
            sinon.stub(urlService, 'getUrlByResourceId').returns('https://site.com/blah/');
            sinon.stub(labs, 'isSet').returns(true);
            const email = {
                post: {
                    status: 'published',
                    visibility: 'paid'
                },
                html: '<p>Free content</p><!--members-only--><p>Members content</p><!-- PAYWALL --><h2>Paywall</h2>',
                plaintext: 'Free content. Members content'
            };

            let output = renderEmailForSegment(email, 'status:free');
            assert.equal(output.html, `<p>Free content</p><!-- PAYWALL --><h2>Paywall</h2>`);
            assert.equal(output.plaintext, `Free content\n\n\nPaywall`);
        });

        it('should hide members-only content for free members on paid posts (without <!-- PAYWALL -->)', function () {
            sinon.stub(urlService, 'getUrlByResourceId').returns('https://site.com/blah/');
            sinon.stub(labs, 'isSet').returns(true);
            const email = {
                post: {
                    status: 'published',
                    visibility: 'paid'
                },
                html: '<body><p>Free content</p><!--members-only--><p>Members content</p><!-- POST CONTENT END --></body>',
                plaintext: 'Free content. Members content'
            };

            let output = renderEmailForSegment(email, 'status:free');
            assert.equal(output.html, `<body><p>Free content</p><!-- POST CONTENT END --></body>`);
            assert.equal(output.plaintext, `Free content`);
        });

        it('should hide members-only content for free members on paid posts (without <!-- PAYWALL --> and <!-- POST CONTENT END -->)', function () {
            sinon.stub(urlService, 'getUrlByResourceId').returns('https://site.com/blah/');
            sinon.stub(labs, 'isSet').returns(true);
            const email = {
                post: {
                    status: 'published',
                    visibility: 'paid'
                },
                html: '<p>Free content</p><!--members-only--><p>Members content</p>',
                plaintext: 'Free content. Members content'
            };

            let output = renderEmailForSegment(email, 'status:free');
            assert.equal(output.html, `<p>Free content</p>`);
            assert.equal(output.plaintext, `Free content`);
        });

        it('should not modify HTML when there are no HTML comments', function () {
            sinon.stub(urlService, 'getUrlByResourceId').returns('https://site.com/blah/');
            sinon.stub(labs, 'isSet').returns(true);
            const email = {
                post: {
                    status: 'published',
                    visibility: 'paid'
                },
                html: '<body><p>Free content</p></body>',
                plaintext: 'Free content. Members content'
            };

            let output = renderEmailForSegment(email, 'status:free');
            assert.equal(output.html, `<body><p>Free content</p></body>`);
            assert.equal(output.plaintext, `Free content`);
        });

        it('should hide paywall when <!-- POST CONTENT END --> is missing (paid members)', function () {
            sinon.stub(urlService, 'getUrlByResourceId').returns('https://site.com/blah/');
            sinon.stub(labs, 'isSet').returns(true);
            const email = {
                post: {
                    status: 'published',
                    visibility: 'paid'
                },
                html: '<p>Free content</p><!-- PAYWALL --><h2>Paywall</h2>',
                plaintext: 'Free content. Members content'
            };

            let output = renderEmailForSegment(email, 'status:-free');
            assert.equal(output.html, `<p>Free content</p>`);
            assert.equal(output.plaintext, `Free content`);
        });

        it('should show members-only content for paid members on paid posts', function () {
            sinon.stub(urlService, 'getUrlByResourceId').returns('https://site.com/blah/');
            sinon.stub(labs, 'isSet').returns(true);
            const email = {
                post: {
                    status: 'published',
                    visibility: 'paid'
                },
                html: '<body><p>Free content</p><!--members-only--><p>Members content</p><!-- PAYWALL --><h2>Paywall</h2><!-- POST CONTENT END --></body>',
                plaintext: 'Free content. Members content'
            };

            let output = renderEmailForSegment(email, 'status:-free');
            assert.equal(output.html, `<body><p>Free content</p><!--members-only--><p>Members content</p><!-- POST CONTENT END --></body>`);
            assert.equal(output.plaintext, `Free content\n\nMembers content`);
        });

        it('should show members-only content for unknown members on paid posts', function () {
            // Test if the default behaviour is to hide any paywalls and show the members-only content
            sinon.stub(urlService, 'getUrlByResourceId').returns('https://site.com/blah/');
            sinon.stub(labs, 'isSet').returns(true);
            const email = {
                post: {
                    status: 'published',
                    visibility: 'paid'
                },
                html: '<body><p>Free content</p><!--members-only--><p>Members content</p><!-- PAYWALL --><h2>Paywall</h2><!-- POST CONTENT END --></body>',
                plaintext: 'Free content. Members content'
            };

            let output = renderEmailForSegment(email, null);
            assert.equal(output.html, `<body><p>Free content</p><!--members-only--><p>Members content</p><!-- POST CONTENT END --></body>`);
            assert.equal(output.plaintext, `Free content\n\nMembers content`);
        });

        it('should show paywall content for free members on specific tier posts', function () {
            sinon.stub(urlService, 'getUrlByResourceId').returns('https://site.com/blah/');
            sinon.stub(labs, 'isSet').returns(true);
            const email = {
                post: {
                    status: 'published',
                    visibility: 'tiers'
                },
                html: '<body><p>Free content</p><!--members-only--><p>Members content</p><!-- PAYWALL --><h2>Paywall</h2><!-- POST CONTENT END --></body>',
                plaintext: 'Free content. Members content'
            };

            let output = renderEmailForSegment(email, 'status:free');
            assert.equal(output.html, `<body><p>Free content</p><!-- PAYWALL --><h2>Paywall</h2><!-- POST CONTENT END --></body>`);
            assert.equal(output.plaintext, `Free content\n\n\nPaywall`);
        });

        it('should show members-only content for paid members on specific tier posts', function () {
            sinon.stub(urlService, 'getUrlByResourceId').returns('https://site.com/blah/');
            sinon.stub(labs, 'isSet').returns(true);
            const email = {
                post: {
                    status: 'published',
                    visibility: 'paid'
                },
                html: '<p>Free content</p><!--members-only--><p>Members content</p>',
                plaintext: 'Free content. Members content'
            };

            let output = renderEmailForSegment(email, 'status:-free');
            assert.equal(output.html, `<p>Free content</p><!--members-only--><p>Members content</p>`);
            assert.equal(output.plaintext, `Free content\n\nMembers content`);
        });

        it('should show full content for free members on free posts', function () {
            sinon.stub(urlService, 'getUrlByResourceId').returns('https://site.com/blah/');
            sinon.stub(labs, 'isSet').returns(true);
            const email = {
                post: {
                    status: 'published',
                    visibility: 'public'
                },
                html: '<p>Free content</p><!--members-only--><p>Members content</p>',
                plaintext: 'Free content. Members content'
            };

            let output = renderEmailForSegment(email, 'status:free');
            assert.equal(output.html, `<p>Free content</p><!--members-only--><p>Members content</p>`);
            assert.equal(output.plaintext, `Free content\n\nMembers content`);
        });

        it('should show full content for paid members on free posts', function () {
            sinon.stub(urlService, 'getUrlByResourceId').returns('https://site.com/blah/');
            sinon.stub(labs, 'isSet').returns(true);
            const email = {
                post: {
                    status: 'published',
                    visibility: 'public'
                },
                html: '<p>Free content</p><!--members-only--><p>Members content</p>',
                plaintext: 'Free content. Members content'
            };

            let output = renderEmailForSegment(email, 'status:-free');
            assert.equal(output.html, `<p>Free content</p><!--members-only--><p>Members content</p>`);
            assert.equal(output.plaintext, `Free content\n\nMembers content`);
        });

        it('should not crash on missing post for email with paywall', function () {
            sinon.stub(urlService, 'getUrlByResourceId').returns('https://site.com/blah/');
            sinon.stub(labs, 'isSet').returns(true);
            const email = {
                html: '<p>Free content</p><!--members-only--><p>Members content</p>',
                plaintext: 'Free content. Members content'
            };

            let output = renderEmailForSegment(email, 'status:-free');
            assert.equal(output.html, `<p>Free content</p><!--members-only--><p>Members content</p>`);
            assert.equal(output.plaintext, `Free content\n\nMembers content`);
        });
    });

    describe('createUnsubscribeUrl', function () {
        before(function () {
            models.init();
        });

        afterEach(function () {
            sinon.restore();
        });

        it('generates unsubscribe url for preview', function () {
            sinon.stub(urlUtils, 'getSiteUrl').returns('https://site.com/blah');
            const unsubscribeUrl = createUnsubscribeUrl(null);
            assert.equal(unsubscribeUrl, 'https://site.com/blah/unsubscribe/?preview=1');
        });

        it('generates unsubscribe url with only member uuid', function () {
            sinon.stub(urlUtils, 'getSiteUrl').returns('https://site.com/blah');
            const unsubscribeUrl = createUnsubscribeUrl('member-abcd');
            assert.equal(unsubscribeUrl, 'https://site.com/blah/unsubscribe/?uuid=member-abcd');
        });

        it('generates unsubscribe url with both post and newsletter uuid', function () {
            sinon.stub(urlUtils, 'getSiteUrl').returns('https://site.com/blah');
            const unsubscribeUrl = createUnsubscribeUrl('member-abcd', {newsletterUuid: 'newsletter-abcd'});
            assert.equal(unsubscribeUrl, 'https://site.com/blah/unsubscribe/?uuid=member-abcd&newsletter=newsletter-abcd');
        });

        it('generates unsubscribe url with comments', function () {
            sinon.stub(urlUtils, 'getSiteUrl').returns('https://site.com/blah');
            const unsubscribeUrl = createUnsubscribeUrl('member-abcd', {comments: true});
            assert.equal(unsubscribeUrl, 'https://site.com/blah/unsubscribe/?uuid=member-abcd&comments=1');
        });
    });

    describe('createPostSignupUrl', function () {
        before(function () {
            models.init();
        });

        afterEach(function () {
            sinon.restore();
        });

        it('generates signup url on post for published post', function () {
            sinon.stub(urlService, 'getUrlByResourceId').returns('https://site.com/blah/');
            const unsubscribeUrl = createPostSignupUrl({
                status: 'published',
                id: 'abc123'
            });
            assert.equal(unsubscribeUrl, 'https://site.com/blah/#/portal/signup');
        });

        it('generates signup url on homepage for email only post', function () {
            sinon.stub(urlService, 'getUrlByResourceId').returns('https://site.com/test/404/');
            sinon.stub(urlUtils, 'getSiteUrl').returns('https://site.com/test/');
            const unsubscribeUrl = createPostSignupUrl({
                status: 'sent',
                id: 'abc123'
            });
            assert.equal(unsubscribeUrl, 'https://site.com/test/#/portal/signup');
        });
    });

    describe('getTemplateSettings', function () {
        before(function () {
            models.init();
        });

        afterEach(function () {
            sinon.restore();
        });

        it('uses the newsletter settings', async function () {
            sinon.stub(settingsCache, 'get').callsFake(function (key) {
                return {
                    icon: 'icon2',
                    accent_color: '#000099'
                }[key];
            });
            const newsletterMock = {
                get: function (key) {
                    return {
                        header_image: 'image',
                        show_header_icon: true,
                        show_header_title: true,
                        show_feature_image: true,
                        title_font_category: 'sans-serif',
                        title_alignment: 'center',
                        body_font_category: 'serif',
                        show_badge: true,
                        footer_content: 'footer',
                        show_header_name: true
                    }[key];
                }
            };
            const res = await _getTemplateSettings(newsletterMock);
            assert.deepStrictEqual(res, {
                headerImage: 'image',
                showHeaderIcon: 'icon2',
                showHeaderTitle: true,
                showFeatureImage: true,
                titleFontCategory: 'sans-serif',
                titleAlignment: 'center',
                bodyFontCategory: 'serif',
                showBadge: true,
                footerContent: 'footer',
                accentColor: '#000099',
                adjustedAccentColor: '#000099',
                adjustedAccentContrastColor: '#FFFFFF',
                showHeaderName: true
            });
        });
    });
});
