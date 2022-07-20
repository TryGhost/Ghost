const should = require('should');
const sinon = require('sinon');
const settingsCache = require('../../../../../core/shared/settings-cache');
const models = require('../../../../../core/server/models');
const urlUtils = require('../../../../../core/shared/url-utils');

const {parseReplacements, renderEmailForSegment, _getTemplateSettings, createUnsubscribeUrl} = require('../../../../../core/server/services/mega/post-email-serializer');

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

    describe('renderEmailForSegment', function () {
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

        it('generates unsubscribe url with only post uuid', function () {
            sinon.stub(urlUtils, 'getSiteUrl').returns('https://site.com/blah');
            const unsubscribeUrl = createUnsubscribeUrl('post-abcd');
            unsubscribeUrl.should.eql('https://site.com/blah/unsubscribe/?uuid=post-abcd');
        });

        it('generates unsubscribe url with both post and newsletter uuid', function () {
            sinon.stub(urlUtils, 'getSiteUrl').returns('https://site.com/blah');
            const unsubscribeUrl = createUnsubscribeUrl('post-abcd', 'newsletter-abcd');
            unsubscribeUrl.should.eql('https://site.com/blah/unsubscribe/?uuid=post-abcd&newsletter=newsletter-abcd');
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
