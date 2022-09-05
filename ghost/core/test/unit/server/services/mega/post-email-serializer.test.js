const should = require('should');
const sinon = require('sinon');
const settingsCache = require('../../../../../core/shared/settings-cache');
const models = require('../../../../../core/server/models');
const urlUtils = require('../../../../../core/shared/url-utils');
const urlService = require('../../../../../core/server/services/url');
const labs = require('../../../../../core/shared/labs');
const {parseReplacements, renderEmailForSegment, serialize, _getTemplateSettings, createUnsubscribeUrl, createPostSignupUrl, _PostEmailSerializer} = require('../../../../../core/server/services/mega/post-email-serializer');

describe('Post Email Serializer', function () {
    it('creates replacement pattern for valid format and value', function () {
        const html = '<html>Hey %%{first_name}%%, what is up?</html>';
        const plaintext = 'Hey %%{first_name}%%, what is up?';

        const replaced = parseReplacements({
            html,
            plaintext
        });

        replaced.length.should.equal(2);
        replaced[0].format.should.equal('html');
        replaced[0].recipientProperty.should.equal('member_first_name');

        replaced[1].format.should.equal('plaintext');
        replaced[1].recipientProperty.should.equal('member_first_name');
    });

    it('does not create replacements for unsupported variable names', function () {
        const html = '<html>Hey %%{last_name}%%, what is up?</html>';
        const plaintext = 'Hey %%{age}%%, what is up?';

        const replaced = parseReplacements({
            html,
            plaintext
        });

        replaced.length.should.equal(0);
    });

    describe('serialize', function () {
        it('should output valid HTML and escape HTML characters in mobiledoc', async function () {
            sinon.stub(_PostEmailSerializer, 'serializePostModel').callsFake(async () => {
                return {
                    // eslint-disable-next-line
                    mobiledoc: JSON.stringify({"version":"0.3.1","atoms":[],"cards":[["markdown",{"markdown":"This is a test markdown <3"}],["email",{"html":"<p>Hey {first_name, \"there\"}, &lt;3</p>"}],["button",{"alignment":"center","buttonText":"Button <3","buttonUrl":"I <3 test"}],["callout",{"calloutEmoji":"💡","calloutText":"Callout test &lt;3","backgroundColor":"grey"}],["toggle",{"heading":"Toggle &lt;3 header","content":"<p>Toggle &lt;3 content</p>"}],["video",{"loop":false,"src":"__GHOST_URL__/content/media/2022/09/20220829-ghost.mp4","fileName":"20220829 ghost.mp4","width":3072,"height":1920,"duration":221.5,"mimeType":"video/mp4","thumbnailSrc":"__GHOST_URL__/content/images/2022/09/media-thumbnail-ember888.jpg","thumbnailWidth":3072,"thumbnailHeight":1920,"caption":"Test &lt;3"}],["file",{"loop":false,"src":"__GHOST_URL__/content/files/2022/09/image--1-.png","fileName":"image (1).png","fileTitle":"Image 1<3","fileCaption":"","fileSize":152594}],["audio",{"loop":false,"src":"__GHOST_URL__/content/media/2022/09/file_example_MP3_700KB.mp3","title":"I <3 audio files","duration":27.252,"mimeType":"audio/mpeg"}],["file",{"loop":false,"src":"__GHOST_URL__/content/files/2022/09/image--1--1.png","fileName":"image (1).png","fileTitle":"I <3 file names","fileCaption":"I <3 file descriptions","fileSize":152594}],["embed",{}],["image",{"src":"__GHOST_URL__/content/images/2022/09/image--1-.png","width":780,"height":744,"caption":"i &lt;3 images","alt":"I <3 image alts"}],["gallery",{"images":[{"fileName":"image (1).png","row":0,"width":780,"height":744,"src":"__GHOST_URL__/content/images/2022/09/image--1--1.png"}],"caption":"I &lt;3 image galleries"}],["hr",{}]],"markups":[["a",["href","https://google.com/<3"]],["strong"],["em"]],"sections":[[1,"p",[[0,[],0,"This is a <3 post test"]]],[10,0],[10,1],[10,2],[10,3],[10,4],[10,5],[10,6],[10,7],[10,8],[10,9],[10,10],[10,11],[10,12],[1,"p",[[0,[0],1,"https://google.com/<3"]]],[1,"p",[[0,[],0,"Paragraph test <3"]]],[1,"p",[[0,[1],1,"Bold paragraph test <3"]]],[1,"h3",[[0,[],0,"Heading test <3"]]],[1,"blockquote",[[0,[],0,"Quote test <3"]]],[1,"p",[[0,[2],1,"Italic test"]]],[1,"p",[]]],"ghostVersion":"4.0"})
                };
            });
            const settingsMock = sinon.stub(settingsCache, 'get');
            settingsMock.withArgs('icon').callsFake(function (key) {
                return {
                    icon: 'icon2',
                    accent_color: '#000099'
                }[key];
            });
            settingsMock.withArgs('accent_color').callsFake(function (key) {
                return {
                    icon: 'icon2',
                    accent_color: '#000099'
                }[key];
            });
            settingsMock.withArgs('timezone').callsFake(function (key) {
                return 'UTC';
            });
            const template = {
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

            // test output html
            const {HtmlValidate} = require('html-validate');

            const htmlvalidate = new HtmlValidate({
                extends: [
                    'html-validate:document'
                ],
                rules: {
                    'no-deprecated-attr': 'off',
                    'heading-level': 'off'
                }
            });
            const report = htmlvalidate.validateString(output.html);

            // Improve debugging and show a snippet of the invalid html
            let reportText = '';
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
            should(report.valid).eql(true, 'Expected valid HTML without warnings, got errors:\n' + parsedErrors.join('\n\n'));
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

            output.should.have.keys('html', 'plaintext', 'otherProperty');
            output.html.should.eql('<div>test</div>');
            output.plaintext.should.eql('test');
            output.otherProperty.should.eql(true); // Make sure to keep other properties
        });

        it('should hide non matching member segments', function () {
            const email = {
                otherProperty: true,
                html: 'hello<div data-gh-segment="status:free"> free users!</div><div data-gh-segment="status:-free"> paid users!</div>',
                plaintext: 'test'
            };
            Object.freeze(email); // Make sure we don't modify `email`

            let output = renderEmailForSegment(email, 'status:free');

            output.should.have.keys('html', 'plaintext', 'otherProperty');
            output.html.should.eql('hello<div> free users!</div>');
            output.plaintext.should.eql('hello free users!');

            output = renderEmailForSegment(email, 'status:-free');

            output.should.have.keys('html', 'plaintext', 'otherProperty');
            output.html.should.eql('hello<div> paid users!</div>');
            output.plaintext.should.eql('hello paid users!');
        });

        it('should hide all segments when the segment filter is empty', function () {
            const email = {
                otherProperty: true,
                html: 'hello<div data-gh-segment="status:free"> free users!</div><div data-gh-segment="status:-free"> paid users!</div>',
                plaintext: 'test'
            };

            let output = renderEmailForSegment(email, null);
            output.html.should.equal('hello');
            output.plaintext.should.equal('hello');
        });

        it('should show paywall content for free members on paid posts', function () {
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
            output.html.should.containEql(`<p>Free content</p>`);
            output.html.should.containEql(`Subscribe to`);
            output.html.should.containEql(`https://site.com/blah/#/portal/signup`);
            output.html.should.not.containEql(`<p>Members content</p>`);

            output.plaintext.should.containEql(`Free content`);
            output.plaintext.should.containEql(`Subscribe to`);
            output.plaintext.should.containEql(`https://site.com/blah/#/portal/signup`);
            output.plaintext.should.not.containEql(`Members content`);
        });

        it('should show full cta for paid members on paid posts', function () {
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
            output.html.should.equal(`<p>Free content</p><!--members-only--><p>Members content</p>`);
            output.plaintext.should.equal(`Free content\n\nMembers content`);
        });

        it('should show paywall content for free members on specific tier posts', function () {
            sinon.stub(urlService, 'getUrlByResourceId').returns('https://site.com/blah/');
            sinon.stub(labs, 'isSet').returns(true);
            const email = {
                post: {
                    status: 'published',
                    visibility: 'tiers'
                },
                html: '<p>Free content</p><!--members-only--><p>Members content</p>',
                plaintext: 'Free content. Members content'
            };

            let output = renderEmailForSegment(email, 'status:free');
            output.html.should.containEql(`<p>Free content</p>`);
            output.html.should.containEql(`Subscribe to`);
            output.html.should.containEql(`https://site.com/blah/#/portal/signup`);
            output.html.should.not.containEql(`<p>Members content</p>`);

            output.plaintext.should.containEql(`Free content`);
            output.plaintext.should.containEql(`Subscribe to`);
            output.plaintext.should.containEql(`https://site.com/blah/#/portal/signup`);
            output.plaintext.should.not.containEql(`Members content`);
        });

        it('should show full cta for paid members on specific tier posts', function () {
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
            output.html.should.equal(`<p>Free content</p><!--members-only--><p>Members content</p>`);
            output.plaintext.should.equal(`Free content\n\nMembers content`);
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
            output.html.should.equal(`<p>Free content</p><!--members-only--><p>Members content</p>`);
            output.plaintext.should.equal(`Free content\n\nMembers content`);
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
            output.html.should.equal(`<p>Free content</p><!--members-only--><p>Members content</p>`);
            output.plaintext.should.equal(`Free content\n\nMembers content`);
        });

        it('should not crash on missing post for email with paywall', function () {
            sinon.stub(urlService, 'getUrlByResourceId').returns('https://site.com/blah/');
            sinon.stub(labs, 'isSet').returns(true);
            const email = {
                html: '<p>Free content</p><!--members-only--><p>Members content</p>',
                plaintext: 'Free content. Members content'
            };

            let output = renderEmailForSegment(email, 'status:-free');
            output.html.should.equal(`<p>Free content</p><!--members-only--><p>Members content</p>`);
            output.plaintext.should.equal(`Free content\n\nMembers content`);
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
            unsubscribeUrl.should.eql('https://site.com/blah/unsubscribe/?preview=1');
        });

        it('generates unsubscribe url with only member uuid', function () {
            sinon.stub(urlUtils, 'getSiteUrl').returns('https://site.com/blah');
            const unsubscribeUrl = createUnsubscribeUrl('member-abcd');
            unsubscribeUrl.should.eql('https://site.com/blah/unsubscribe/?uuid=member-abcd');
        });

        it('generates unsubscribe url with both post and newsletter uuid', function () {
            sinon.stub(urlUtils, 'getSiteUrl').returns('https://site.com/blah');
            const unsubscribeUrl = createUnsubscribeUrl('member-abcd', {newsletterUuid: 'newsletter-abcd'});
            unsubscribeUrl.should.eql('https://site.com/blah/unsubscribe/?uuid=member-abcd&newsletter=newsletter-abcd');
        });

        it('generates unsubscribe url with comments', function () {
            sinon.stub(urlUtils, 'getSiteUrl').returns('https://site.com/blah');
            const unsubscribeUrl = createUnsubscribeUrl('member-abcd', {comments: true});
            unsubscribeUrl.should.eql('https://site.com/blah/unsubscribe/?uuid=member-abcd&comments=1');
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
            unsubscribeUrl.should.eql('https://site.com/blah/#/portal/signup');
        });

        it('generates signup url on homepage for email only post', function () {
            sinon.stub(urlService, 'getUrlByResourceId').returns('https://site.com/test/404/');
            sinon.stub(urlUtils, 'getSiteUrl').returns('https://site.com/test/');
            const unsubscribeUrl = createPostSignupUrl({
                status: 'sent',
                id: 'abc123'
            });
            unsubscribeUrl.should.eql('https://site.com/test/#/portal/signup');
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
            should(res).eql({
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
