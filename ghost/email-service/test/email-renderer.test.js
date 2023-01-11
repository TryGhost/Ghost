const {EmailRenderer} = require('../');
const assert = require('assert');
const cheerio = require('cheerio');
const {createModel} = require('./utils');
const linkReplacer = require('@tryghost/link-replacer');
const sinon = require('sinon');
const logging = require('@tryghost/logging');

describe('Email renderer', function () {
    let logStub;

    beforeEach(function () {
        logStub = sinon.stub(logging, 'error');
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('buildReplacementDefinitions', function () {
        let emailRenderer;
        let newsletter;
        let member;

        beforeEach(function () {
            emailRenderer = new EmailRenderer({
                urlUtils: {
                    urlFor: () => 'http://example.com/subdirectory'
                }
            });
            newsletter = createModel({
                uuid: 'newsletteruuid'
            });
            member = {
                id: '456',
                uuid: 'myuuid',
                name: 'Test User',
                email: 'test@example.com'
            };
        });

        it('returns an empty list of replacements if nothing is used', function () {
            const html = 'Hello world';
            const replacements = emailRenderer.buildReplacementDefinitions({html, newsletter});
            assert.equal(replacements.length, 0);
        });

        it('returns a replacement if it is used', function () {
            const html = 'Hello world %%{uuid}%%';
            const replacements = emailRenderer.buildReplacementDefinitions({html, newsletter});
            assert.equal(replacements.length, 1);
            assert.equal(replacements[0].token.toString(), '/%%\\{uuid\\}%%/g');
            assert.equal(replacements[0].id, 'uuid');
            assert.equal(replacements[0].getValue(member), 'myuuid');
        });

        it('returns a replacement only once if used multiple times', function () {
            const html = 'Hello world %%{uuid}%% And %%{uuid}%%';
            const replacements = emailRenderer.buildReplacementDefinitions({html, newsletter});
            assert.equal(replacements.length, 1);
            assert.equal(replacements[0].token.toString(), '/%%\\{uuid\\}%%/g');
            assert.equal(replacements[0].id, 'uuid');
            assert.equal(replacements[0].getValue(member), 'myuuid');
        });

        it('returns correct first name', function () {
            const html = 'Hello %%{first_name}%%,';
            const replacements = emailRenderer.buildReplacementDefinitions({html, newsletter});
            assert.equal(replacements.length, 1);
            assert.equal(replacements[0].token.toString(), '/%%\\{first_name\\}%%/g');
            assert.equal(replacements[0].id, 'first_name');
            assert.equal(replacements[0].getValue(member), 'Test');
        });

        it('returns correct unsubscribe url', function () {
            const html = 'Hello %%{unsubscribe_url}%%,';
            const replacements = emailRenderer.buildReplacementDefinitions({html, newsletter});
            assert.equal(replacements.length, 1);
            assert.equal(replacements[0].token.toString(), '/%%\\{unsubscribe_url\\}%%/g');
            assert.equal(replacements[0].id, 'unsubscribe_url');
            assert.equal(replacements[0].getValue(member), `http://example.com/subdirectory/unsubscribe/?uuid=myuuid&newsletter=newsletteruuid`);
        });

        it('supports fallback values', function () {
            const html = 'Hey %%{first_name, "there"}%%,';
            const replacements = emailRenderer.buildReplacementDefinitions({html, newsletter});
            assert.equal(replacements.length, 1);
            assert.equal(replacements[0].token.toString(), '/%%\\{first_name, "there"\\}%%/g');
            assert.equal(replacements[0].id, 'first_name_2');
            assert.equal(replacements[0].getValue(member), 'Test');

            // In case of empty name
            assert.equal(replacements[0].getValue({name: ''}), 'there');
        });

        it('supports combination of multiple fallback values', function () {
            const html = 'Hey %%{first_name, "there"}%%, %%{first_name, "member"}%% %%{first_name}%% %%{first_name, "there"}%%';
            const replacements = emailRenderer.buildReplacementDefinitions({html, newsletter});
            assert.equal(replacements.length, 3);
            assert.equal(replacements[0].token.toString(), '/%%\\{first_name, "there"\\}%%/g');
            assert.equal(replacements[0].id, 'first_name_2');
            assert.equal(replacements[0].getValue(member), 'Test');

            // In case of empty name
            assert.equal(replacements[0].getValue({name: ''}), 'there');

            assert.equal(replacements[1].token.toString(), '/%%\\{first_name, "member"\\}%%/g');
            assert.equal(replacements[1].id, 'first_name_3');
            assert.equal(replacements[1].getValue(member), 'Test');

            // In case of empty name
            assert.equal(replacements[1].getValue({name: ''}), 'member');

            assert.equal(replacements[2].token.toString(), '/%%\\{first_name\\}%%/g');
            assert.equal(replacements[2].id, 'first_name');
            assert.equal(replacements[2].getValue(member), 'Test');

            // In case of empty name
            assert.equal(replacements[2].getValue({name: ''}), '');
        });
    });

    describe('getSubject', function () {
        const emailRenderer = new EmailRenderer({
            urlUtils: {
                urlFor: () => 'http://example.com'
            }
        });

        it('returns a post with correct subject from meta', function () {
            const post = createModel({
                posts_meta: createModel({
                    email_subject: 'Test Newsletter'
                }),
                title: 'Sample Post',
                loaded: ['posts_meta']
            });
            let response = emailRenderer.getSubject(post);
            response.should.equal('Test Newsletter');
        });

        it('returns a post with correct subject from title', function () {
            const post = createModel({
                posts_meta: createModel({
                    email_subject: ''
                }),
                title: 'Sample Post',
                loaded: ['posts_meta']
            });
            let response = emailRenderer.getSubject(post);
            response.should.equal('Sample Post');
        });
    });

    describe('getFromAddress', function () {
        let siteTitle = 'Test Blog';
        let emailRenderer = new EmailRenderer({
            settingsCache: {
                get: (key) => {
                    if (key === 'title') {
                        return siteTitle;
                    }
                }
            },
            settingsHelpers: {
                getNoReplyAddress: () => {
                    return 'reply@example.com';
                }
            }
        });

        it('returns correct from address for newsletter', function () {
            const newsletter = createModel({
                sender_email: 'ghost@example.com',
                sender_name: 'Ghost'
            });
            const response = emailRenderer.getFromAddress({}, newsletter);
            response.should.equal('"Ghost" <ghost@example.com>');
        });

        it('defaults to site title and domain', function () {
            const newsletter = createModel({
                sender_email: '',
                sender_name: ''
            });
            const response = emailRenderer.getFromAddress({}, newsletter);
            response.should.equal('"Test Blog" <reply@example.com>');
        });

        it('changes localhost domain to proper domain in development', function () {
            const newsletter = createModel({
                sender_email: 'example@localhost',
                sender_name: ''
            });
            const response = emailRenderer.getFromAddress({}, newsletter);
            response.should.equal('"Test Blog" <localhost@example.com>');
        });

        it('ignores empty sender names', function () {
            siteTitle = '';
            const newsletter = createModel({
                sender_email: 'example@example.com',
                sender_name: ''
            });
            const response = emailRenderer.getFromAddress({}, newsletter);
            response.should.equal('example@example.com');
        });
    });

    describe('getReplyToAddress', function () {
        let emailRenderer = new EmailRenderer({
            settingsCache: {
                get: (key) => {
                    if (key === 'title') {
                        return 'Test Blog';
                    }
                }
            },
            settingsHelpers: {
                getMembersSupportAddress: () => {
                    return 'support@example.com';
                },
                getNoReplyAddress: () => {
                    return 'reply@example.com';
                }
            }
        });

        it('returns support address', function () {
            const newsletter = createModel({
                sender_email: 'ghost@example.com',
                sender_name: 'Ghost',
                sender_reply_to: 'support'
            });
            const response = emailRenderer.getReplyToAddress({}, newsletter);
            response.should.equal('support@example.com');
        });

        it('returns correct reply to address for newsletter', function () {
            const newsletter = createModel({
                sender_email: 'ghost@example.com',
                sender_name: 'Ghost',
                sender_reply_to: 'newsletter'
            });
            const response = emailRenderer.getReplyToAddress({}, newsletter);
            response.should.equal(`"Ghost" <ghost@example.com>`);
        });
    });

    describe('getSegments', function () {
        let emailRenderer = new EmailRenderer({
            renderers: {
                lexical: {
                    render: () => {
                        return '<p> Lexical Test</p>';
                    }
                },
                mobiledoc: {
                    render: () => {
                        return '<p> Mobiledoc Test</p>';
                    }
                }
            }
        });

        it('returns correct empty segment for post', function () {
            let post = {
                url: '',
                get: (key) => {
                    if (key === 'lexical') {
                        return '{}';
                    }
                }
            };
            let response = emailRenderer.getSegments(post);
            response.should.eql([null]);

            post = {
                url: '',
                get: (key) => {
                    if (key === 'mobiledoc') {
                        return '{}';
                    }
                }
            };
            response = emailRenderer.getSegments(post);
            response.should.eql([null]);
        });

        it('returns correct segments for post with members only card', function () {
            emailRenderer = new EmailRenderer({
                renderers: {
                    lexical: {
                        render: () => {
                            return '<p> Lexical Test <!--members-only--> members only section</p>';
                        }
                    }
                }
            });

            let post = {
                url: '',
                get: (key) => {
                    if (key === 'lexical') {
                        return '{}';
                    }
                }
            };
            let response = emailRenderer.getSegments(post);
            response.should.eql(['status:free', 'status:-free']);
        });

        it('returns correct segments for post with email card', function () {
            emailRenderer = new EmailRenderer({
                renderers: {
                    lexical: {
                        render: () => {
                            return '<html> <div> Lexical Test </div> <div data-gh-segment="status:-free"> members only section</div> </html>';
                        }
                    }
                }
            });

            let post = {
                url: '',
                get: (key) => {
                    if (key === 'lexical') {
                        return '{}';
                    }
                }
            };
            let response = emailRenderer.getSegments(post);
            response.should.eql(['status:-free']);
        });
    });

    describe('renderBody', function () {
        let renderedPost = '<p>Lexical Test</p>';
        let emailRenderer = new EmailRenderer({
            audienceFeedbackService: {
                buildLink: (_uuid, _postId, score) => {
                    return new URL('http://feedback-link.com/?score=' + encodeURIComponent(score) + '&uuid=' + encodeURIComponent(_uuid));
                }
            },
            urlUtils: {
                urlFor: (type) => {
                    if (type === 'image') {
                        return 'http://icon.example.com';
                    }
                    return 'http://example.com/subdirectory';
                },
                isSiteUrl: (u) => {
                    return u.hostname === 'example.com';
                }
            },
            settingsCache: {
                get: (key) => {
                    if (key === 'accent_color') {
                        return '#ffffff';
                    }
                    if (key === 'timezone') {
                        return 'Etc/UTC';
                    }
                    if (key === 'title') {
                        return 'Test Blog';
                    }
                    if (key === 'icon') {
                        return 'ICON';
                    }
                }
            },
            getPostUrl: () => {
                return 'http://example.com';
            },
            renderers: {
                lexical: {
                    render: () => {
                        return renderedPost;
                    }
                },
                mobiledoc: {
                    render: () => {
                        return '<p> Mobiledoc Test</p>';
                    }
                }
            },
            linkReplacer,
            memberAttributionService: {
                addEmailSourceAttributionTracking: (u, newsletter) => {
                    u.searchParams.append('source_tracking', newsletter?.get('name') ?? 'site');
                    return u;
                },
                addPostAttributionTracking: (u) => {
                    u.searchParams.append('post_tracking', 'added');
                    return u;
                }
            },
            linkTracking: {
                service: {
                    addTrackingToUrl: (u, _post, uuid) => {
                        return new URL('http://tracked-link.com/?m=' + encodeURIComponent(uuid) + '&url=' + encodeURIComponent(u.href));
                    }
                }
            }
        });
        let basePost;

        beforeEach(function () {
            basePost = {
                url: '',
                lexical: '{}',
                visibility: 'public',
                title: 'Test Post',
                plaintext: 'Test plaintext for post',
                custom_excerpt: null,
                authors: [
                    createModel({
                        name: 'Test Author'
                    })
                ],
                posts_meta: createModel({
                    feature_image_alt: null,
                    feature_image_caption: null
                }),
                loaded: ['posts_meta']
            };
        });

        it('returns feedback buttons and unsubcribe links', async function () {
            const post = createModel(basePost);
            const newsletter = createModel({
                header_image: null,
                name: 'Test Newsletter',
                show_badge: false,
                feedback_enabled: true
            });
            const segment = null;
            const options = {};

            let response = await emailRenderer.renderBody(
                post,
                newsletter,
                segment,
                options
            );

            const $ = cheerio.load(response.html);

            response.plaintext.should.containEql('Test Post');

            // Unsubscribe button included
            response.plaintext.should.containEql('Unsubscribe [%%{unsubscribe_url}%%]');
            response.html.should.containEql('Unsubscribe');
            response.replacements.length.should.eql(2);
            response.replacements.should.match([
                {
                    id: 'uuid'
                },
                {
                    id: 'unsubscribe_url',
                    token: /%%\{unsubscribe_url\}%%/g
                }
            ]);

            response.plaintext.should.containEql('http://example.com');
            should($('.preheader').text()).eql('Test plaintext for post');
            response.html.should.containEql('Test Post');
            response.html.should.containEql('http://example.com');

            // Does not include Ghost badge
            response.html.should.not.containEql('https://ghost.org/');

            // Test feedback buttons included
            response.html.should.containEql('http://feedback-link.com/?score=1');
            response.html.should.containEql('http://feedback-link.com/?score=0');
        });

        it('uses custom excerpt as preheader', async function () {
            const post = createModel({...basePost, custom_excerpt: 'Custom excerpt'});
            const newsletter = createModel({
                header_image: null,
                name: 'Test Newsletter',
                show_badge: false,
                feedback_enabled: true
            });
            const segment = null;
            const options = {};

            let response = await emailRenderer.renderBody(
                post,
                newsletter,
                segment,
                options
            );

            const $ = cheerio.load(response.html);
            should($('.preheader').text()).eql('Custom excerpt');
        });

        it('only includes first author if more than 2', async function () {
            const post = createModel({...basePost, authors: [
                createModel({
                    name: 'A'
                }),
                createModel({
                    name: 'B'
                }),
                createModel({
                    name: 'C'
                })
            ]});
            const newsletter = createModel({
                header_image: null,
                name: 'Test Newsletter',
                show_badge: false,
                feedback_enabled: true
            });
            const segment = null;
            const options = {};

            let response = await emailRenderer.renderBody(
                post,
                newsletter,
                segment,
                options
            );

            assert.match(response.html, /By A &amp; 2 others/);
            assert.match(response.plaintext, /By A & 2 others/);
        });

        it('includes header icon, title, name', async function () {
            const post = createModel(basePost);
            const newsletter = createModel({
                header_image: null,
                name: 'Test Newsletter',
                show_badge: false,
                feedback_enabled: true,

                show_header_icon: true,
                show_header_title: true,
                show_header_name: true
            });
            const segment = null;
            const options = {};

            let response = await emailRenderer.renderBody(
                post,
                newsletter,
                segment,
                options
            );

            response.html.should.containEql('http://icon.example.com');
            assert.match(response.html, /class="site-title"[^>]*?>Test Blog/);
            assert.match(response.html, /class="site-subtitle"[^>]*?>Test Newsletter/);
        });

        it('includes header icon and name', async function () {
            const post = createModel(basePost);
            const newsletter = createModel({
                header_image: null,
                name: 'Test Newsletter',
                show_badge: false,
                feedback_enabled: true,

                show_header_icon: true,
                show_header_title: false,
                show_header_name: true
            });
            const segment = null;
            const options = {};

            let response = await emailRenderer.renderBody(
                post,
                newsletter,
                segment,
                options
            );

            response.html.should.containEql('http://icon.example.com');
            assert.match(response.html, /class="site-title"[^>]*?>Test Newsletter/);
        });

        it('includes Ghost badge if enabled', async function () {
            const post = createModel(basePost);
            const newsletter = createModel({
                header_image: null,
                name: 'Test Newsletter',
                show_badge: true,
                feedback_enabled: false
            });
            const segment = null;
            const options = {};

            let response = await emailRenderer.renderBody(
                post,
                newsletter,
                segment,
                options
            );

            // Does include include Ghost badge
            assert.match(response.html, /https:\/\/ghost.org\//);

            // Test feedback buttons not included
            response.html.should.not.containEql('http://feedback-link.com/?score=1');
            response.html.should.not.containEql('http://feedback-link.com/?score=0');
        });

        it('includes newsletter footer as raw html', async function () {
            const post = createModel(basePost);
            const newsletter = createModel({
                header_image: null,
                name: 'Test Newsletter',
                show_badge: true,
                feedback_enabled: false,
                footer_content: '<p>Test footer</p>'
            });
            const segment = null;
            const options = {};

            let response = await emailRenderer.renderBody(
                post,
                newsletter,
                segment,
                options
            );

            // Test footer
            response.html.should.containEql('Test footer</p>'); // begin tag skipped because style is inlined in that tag
            response.plaintext.should.containEql('Test footer');
        });

        it('replaces all links except the unsubscribe and feedback links', async function () {
            const post = createModel(basePost);
            const newsletter = createModel({
                header_image: null,
                name: 'Test Newsletter',
                show_badge: true,
                feedback_enabled: true
            });
            const segment = null;
            const options = {
                clickTrackingEnabled: true
            };

            renderedPost = '<p>Lexical Test</p><p><a href="https://external-domain.com/?ref=123">Hello</a><a href="https://example.com/?ref=123"><img src="example" /></a></p>';

            let response = await emailRenderer.renderBody(
                post,
                newsletter,
                segment,
                options
            );

            // Check all links have domain tracked-link.com
            const $ = cheerio.load(response.html);
            const links = [];
            for (const link of $('a').toArray()) {
                const href = $(link).attr('href');
                links.push(href);
                if (href.includes('unsubscribe_url')) {
                    href.should.eql('%%{unsubscribe_url}%%');
                } else if (href.includes('feedback-link.com')) {
                    href.should.containEql('%%{uuid}%%');
                } else {
                    href.should.containEql('tracked-link.com');
                    href.should.containEql('m=%%{uuid}%%');
                }
            }

            // Update the following array when you make changes to the email template, check if replacements are correct for each newly added link.
            assert.deepEqual(links, [
                `http://tracked-link.com/?m=%%{uuid}%%&url=http%3A%2F%2Fexample.com%2F%3Fsource_tracking%3DTest%2BNewsletter%26post_tracking%3Dadded`,
                `http://tracked-link.com/?m=%%{uuid}%%&url=http%3A%2F%2Fexample.com%2F%3Fsource_tracking%3DTest%2BNewsletter%26post_tracking%3Dadded`,
                `http://tracked-link.com/?m=%%{uuid}%%&url=https%3A%2F%2Fexternal-domain.com%2F%3Fref%3D123%26source_tracking%3Dsite`,
                `http://tracked-link.com/?m=%%{uuid}%%&url=https%3A%2F%2Fexample.com%2F%3Fref%3D123%26source_tracking%3DTest%2BNewsletter%26post_tracking%3Dadded`,
                `http://feedback-link.com/?score=1&uuid=%%{uuid}%%`,
                `http://feedback-link.com/?score=0&uuid=%%{uuid}%%`,
                `%%{unsubscribe_url}%%`,
                `http://tracked-link.com/?m=%%{uuid}%%&url=https%3A%2F%2Fghost.org%2F%3Fsource_tracking%3Dsite`
            ]);

            // Check uuid in replacements
            response.replacements.length.should.eql(2);
            response.replacements[0].id.should.eql('uuid');
            response.replacements[0].token.should.eql(/%%\{uuid\}%%/g);
            response.replacements[1].id.should.eql('unsubscribe_url');
            response.replacements[1].token.should.eql(/%%\{unsubscribe_url\}%%/g);
        });

        it('removes data-gh-segment and renders paywall', async function () {
            renderedPost = '<div> Lexical Test </div> <div data-gh-segment="status:-free"> members only section</div> some text for both <!--members-only--> finishing part only for members';
            let post = {
                url: '',
                related: () => {
                    return null;
                },
                get: (key) => {
                    if (key === 'lexical') {
                        return '{}';
                    }

                    if (key === 'visibility') {
                        return 'paid';
                    }

                    if (key === 'title') {
                        return 'Test Post';
                    }
                },
                getLazyRelation: () => {
                    return {
                        models: [{
                            get: (key) => {
                                if (key === 'name') {
                                    return 'Test Author';
                                }
                            }
                        }]
                    };
                }
            };
            let newsletter = {
                get: (key) => {
                    if (key === 'header_image') {
                        return null;
                    }

                    if (key === 'name') {
                        return 'Test Newsletter';
                    }

                    if (key === 'badge') {
                        return false;
                    }

                    if (key === 'feedback_enabled') {
                        return true;
                    }
                    return false;
                }
            };
            let options = {};

            let response = await emailRenderer.renderBody(
                post,
                newsletter,
                'status:free',
                options
            );

            response.plaintext.should.containEql('Test Post');
            response.plaintext.should.containEql('Unsubscribe [%%{unsubscribe_url}%%]');
            response.plaintext.should.containEql('http://example.com');
            response.html.should.containEql('Test Post');
            response.html.should.containEql('Unsubscribe');
            response.html.should.containEql('http://example.com');
            response.replacements.length.should.eql(2);
            response.replacements.should.match([
                {
                    id: 'uuid'
                },
                {
                    id: 'unsubscribe_url',
                    token: /%%\{unsubscribe_url\}%%/g
                }
            ]);
            response.html.should.not.containEql('members only section');
            response.html.should.containEql('some text for both');
            response.html.should.not.containEql('finishing part only for members');
            response.html.should.containEql('Become a paid member of Test Blog to get access to all');

            let responsePaid = await emailRenderer.renderBody(
                post,
                newsletter,
                'status:-free',
                options
            );
            responsePaid.html.should.containEql('members only section');
            responsePaid.html.should.containEql('some text for both');
            responsePaid.html.should.containEql('finishing part only for members');
            responsePaid.html.should.not.containEql('Become a paid member of Test Blog to get access to all');
        });
    });

    describe('getTemplateData', function () {
        let settings = {};
        const emailRenderer = new EmailRenderer({
            audienceFeedbackService: {
                buildLink: (_uuid, _postId, score) => {
                    return new URL('http://feedback-link.com/?score=' + encodeURIComponent(score) + '&uuid=' + encodeURIComponent(_uuid));
                }
            },
            urlUtils: {
                urlFor: (type) => {
                    if (type === 'image') {
                        return 'http://icon.example.com';
                    }
                    return 'http://example.com/subdirectory';
                },
                isSiteUrl: (u) => {
                    return u.hostname === 'example.com';
                }
            },
            settingsCache: {
                get: (key) => {
                    return settings[key];
                }
            },
            getPostUrl: () => {
                return 'http://example.com';
            }
        });

        beforeEach(function () {
            settings = {};
        });

        it('uses default accent color', async function () {
            const html = '';
            const post = createModel({
                posts_meta: createModel({}),
                loaded: ['posts_meta']
            });
            const newsletter = createModel({});
            const data = await emailRenderer.getTemplateData({post, newsletter, html, addPaywall: false});
            assert.equal(data.accentColor, '#15212A');
        });

        it('handles invalid accent color', async function () {
            const html = '';
            settings.accent_color = '#QR';
            const post = createModel({
                posts_meta: createModel({}),
                loaded: ['posts_meta']
            });
            const newsletter = createModel({});
            const data = await emailRenderer.getTemplateData({post, newsletter, html, addPaywall: false});
            assert.equal(data.accentColor, '#15212A');
        });

        it('uses post published_at', async function () {
            const html = '';
            const post = createModel({
                posts_meta: createModel({}),
                loaded: ['posts_meta'],
                published_at: new Date(0)
            });
            const newsletter = createModel({});
            const data = await emailRenderer.getTemplateData({post, newsletter, html, addPaywall: false});
            assert.equal(data.post.publishedAt, '1 Jan 1970');
        });

        it('show feature image if post has feature image', async function () {
            const html = '';
            const post = createModel({
                posts_meta: createModel({}),
                loaded: ['posts_meta'],
                published_at: new Date(0),
                feature_image: 'http://example.com/image.jpg'
            });
            const newsletter = createModel({
                show_feature_image: true
            });
            const data = await emailRenderer.getTemplateData({post, newsletter, html, addPaywall: false});
            assert.equal(data.showFeatureImage, true);
        });

        it('uses newsletter font styles', async function () {
            const html = '';
            const post = createModel({
                posts_meta: createModel({}),
                loaded: ['posts_meta'],
                published_at: new Date(0)
            });
            const newsletter = createModel({
                title_font_category: 'serif',
                title_alignment: 'left',
                body_font_category: 'sans_serif'
            });
            const data = await emailRenderer.getTemplateData({post, newsletter, html, addPaywall: false});
            assert.deepEqual(data.classes, {
                title: 'post-title post-title-serif post-title-left',
                titleLink: 'post-title-link post-title-link-left',
                meta: 'post-meta post-meta-left',
                body: 'post-content-sans-serif'
            });
        });
    });

    describe('createUnsubscribeUrl', function () {
        it('includes member uuid and newsletter id', async function () {
            const emailRenderer = new EmailRenderer({
                urlUtils: {
                    urlFor() {
                        return 'http://example.com/subdirectory';
                    }
                }
            });
            const response = await emailRenderer.createUnsubscribeUrl('memberuuid', {
                newsletterUuid: 'newsletteruuid'
            });
            assert.equal(response, `http://example.com/subdirectory/unsubscribe/?uuid=memberuuid&newsletter=newsletteruuid`);
        });

        it('includes comments', async function () {
            const emailRenderer = new EmailRenderer({
                urlUtils: {
                    urlFor() {
                        return 'http://example.com/subdirectory';
                    }
                }
            });
            const response = await emailRenderer.createUnsubscribeUrl('memberuuid', {
                comments: true
            });
            assert.equal(response, `http://example.com/subdirectory/unsubscribe/?uuid=memberuuid&comments=1`);
        });

        it('works for previews', async function () {
            const emailRenderer = new EmailRenderer({
                urlUtils: {
                    urlFor() {
                        return 'http://example.com/subdirectory';
                    }
                }
            });
            const response = await emailRenderer.createUnsubscribeUrl();
            assert.equal(response, `http://example.com/subdirectory/unsubscribe/?preview=1`);
        });
    });

    describe('limitImageWidth', function () {
        it('Limits width of local images', async function () {
            const emailRenderer = new EmailRenderer({
                imageSize: {
                    getImageSizeFromUrl() {
                        return {
                            width: 2000
                        };
                    }
                },
                storageUtils: {
                    isLocalImage(url) {
                        return url === 'http://your-blog.com/content/images/2017/01/02/example.png';
                    }
                }
            });
            const response = await emailRenderer.limitImageWidth('http://your-blog.com/content/images/2017/01/02/example.png');
            assert.equal(response.width, 600);
            assert.equal(response.href, 'http://your-blog.com/content/images/size/w1200/2017/01/02/example.png');
        });

        it('Ignores and logs errors', async function () {
            const emailRenderer = new EmailRenderer({
                imageSize: {
                    getImageSizeFromUrl() {
                        throw new Error('Oops, this is a test.');
                    }
                },
                storageUtils: {
                    isLocalImage(url) {
                        return url === 'http://your-blog.com/content/images/2017/01/02/example.png';
                    }
                }
            });
            const response = await emailRenderer.limitImageWidth('http://your-blog.com/content/images/2017/01/02/example.png');
            assert.equal(response.width, 0);
            assert.equal(response.href, 'http://your-blog.com/content/images/2017/01/02/example.png');
            sinon.assert.calledOnce(logStub);
        });

        it('Limits width of unsplash images', async function () {
            const emailRenderer = new EmailRenderer({
                imageSize: {
                    getImageSizeFromUrl() {
                        return {
                            width: 2000
                        };
                    }
                },
                storageUtils: {
                    isLocalImage(url) {
                        return url === 'http://your-blog.com/content/images/2017/01/02/example.png';
                    }
                }
            });
            const response = await emailRenderer.limitImageWidth('https://images.unsplash.com/photo-1657816793628-191deb91e20f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=MnwxMTc3M3wwfDF8YWxsfDJ8fHx8fHwyfHwxNjU3ODkzNjU5&ixlib=rb-1.2.1&q=80&w=2000');
            assert.equal(response.width, 600);
            assert.equal(response.href, 'https://images.unsplash.com/photo-1657816793628-191deb91e20f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=MnwxMTc3M3wwfDF8YWxsfDJ8fHx8fHwyfHwxNjU3ODkzNjU5&ixlib=rb-1.2.1&q=80&w=1200');
        });

        it('Does not increase width of images', async function () {
            const emailRenderer = new EmailRenderer({
                imageSize: {
                    getImageSizeFromUrl() {
                        return {
                            width: 300
                        };
                    }
                },
                storageUtils: {
                    isLocalImage(url) {
                        return url === 'http://your-blog.com/content/images/2017/01/02/example.png';
                    }
                }
            });
            const response = await emailRenderer.limitImageWidth('https://example.com/image.png');
            assert.equal(response.width, 300);
            assert.equal(response.href, 'https://example.com/image.png');
        });
    });
});
