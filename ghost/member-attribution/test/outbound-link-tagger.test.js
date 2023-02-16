// Switch these lines once there are useful utils
// const testUtils = require('./utils');
require('./utils');
const {OutboundLinkTagger} = require('../');
const assert = require('assert');

describe('OutboundLinkTagger', function () {
    describe('Constructor', function () {
        it('doesn\'t throw', function () {
            new OutboundLinkTagger({});
        });
    });

    describe('addToUrl', function () {
        it('uses sluggified sitename for external urls', async function () {
            const service = new OutboundLinkTagger({
                getSiteTitle: () => 'Hello world',
                isEnabled: () => true
            });
            const url = new URL('https://example.com/');
            const updatedUrl = await service.addToUrl(url);

            should(updatedUrl.toString()).equal('https://example.com/?ref=hello-world');
        });

        it('does not add if disabled', async function () {
            const service = new OutboundLinkTagger({
                getSiteTitle: () => 'Hello world',
                isEnabled: () => false
            });
            const url = new URL('https://example.com/');
            const updatedUrl = await service.addToUrl(url);

            should(updatedUrl.toString()).equal('https://example.com/');
        });

        it('uses sluggified newsletter name for internal urls', async function () {
            const service = new OutboundLinkTagger({
                getSiteTitle: () => 'Hello world',
                isEnabled: () => true
            });
            const url = new URL('https://example.com/');
            const newsletterName = 'used newsletter name';
            const newsletter = {
                get: (t) => {
                    if (t === 'name') {
                        return newsletterName;
                    }
                }
            };

            const updatedUrl = await service.addToUrl(url, newsletter);

            should(updatedUrl.toString()).equal('https://example.com/?ref=used-newsletter-name-newsletter');
        });

        it('does not repeat newsletter at the end of the newsletter name', async function () {
            const service = new OutboundLinkTagger({
                getSiteTitle: () => 'Hello world',
                isEnabled: () => true
            });
            const url = new URL('https://example.com/');
            const newsletterName = 'Weekly newsletter';
            const newsletter = {
                get: (t) => {
                    if (t === 'name') {
                        return newsletterName;
                    }
                }
            };
            const updatedUrl = await service.addToUrl(url, newsletter);

            should(updatedUrl.toString()).equal('https://example.com/?ref=weekly-newsletter');
        });

        it('does not add ref to blocked domains', async function () {
            const service = new OutboundLinkTagger({
                getSiteTitle: () => 'Hello world',
                isEnabled: () => true
            });
            const url = new URL('https://facebook.com/');
            const updatedUrl = await service.addToUrl(url);

            should(updatedUrl.toString()).equal('https://facebook.com/');
        });

        it('does not add ref if utm_source is present', async function () {
            const service = new OutboundLinkTagger({
                getSiteTitle: () => 'Hello world',
                isEnabled: () => true
            });
            const url = new URL('https://example.com/?utm_source=hello');
            const updatedUrl = await service.addToUrl(url);
            should(updatedUrl.toString()).equal('https://example.com/?utm_source=hello');
        });

        it('does not add ref if ref is present', async function () {
            const service = new OutboundLinkTagger({
                getSiteTitle: () => 'Hello world',
                isEnabled: () => true
            });
            const url = new URL('https://example.com/?ref=hello');
            const updatedUrl = await service.addToUrl(url);
            should(updatedUrl.toString()).equal('https://example.com/?ref=hello');
        });

        it('does not add ref if source is present', async function () {
            const service = new OutboundLinkTagger({
                getSiteTitle: () => 'Hello world',
                isEnabled: () => true
            });
            const url = new URL('https://example.com/?source=hello');
            const updatedUrl = await service.addToUrl(url);
            should(updatedUrl.toString()).equal('https://example.com/?source=hello');
        });
    });

    describe('addToHtml', function () {
        it('adds refs to external links', async function () {
            const service = new OutboundLinkTagger({
                getSiteTitle: () => 'Hello world',
                isEnabled: () => true,
                urlUtils: {
                    isSiteUrl: () => false
                }
            });
            const html = await service.addToHtml('<a href="https://example.com/test-site">Hello world</a><a href="https://other.com/test/">Hello world</a>');
            assert.equal(html, '<a href="https://example.com/test-site?ref=hello-world">Hello world</a><a href="https://other.com/test/?ref=hello-world">Hello world</a>');
        });

        it('does not add refs to internal links', async function () {
            const service = new OutboundLinkTagger({
                getSiteTitle: () => 'Hello world',
                isEnabled: () => true,
                urlUtils: {
                    isSiteUrl: () => true
                }
            });
            const html = await service.addToHtml('<a href="https://example.com/test-site">Hello world</a><a href="https://other.com/test/">Hello world</a>');
            assert.equal(html, '<a href="https://example.com/test-site">Hello world</a><a href="https://other.com/test/">Hello world</a>');
        });

        it('does not add refs if disabled', async function () {
            const service = new OutboundLinkTagger({
                getSiteTitle: () => 'Hello world',
                isEnabled: () => false,
                urlUtils: {
                    isSiteUrl: () => false
                }
            });
            const html = await service.addToHtml('<a href="https://example.com/test-site">Hello world</a><a href="https://other.com/test/">Hello world</a>');
            assert.equal(html, '<a href="https://example.com/test-site">Hello world</a><a href="https://other.com/test/">Hello world</a>');
        });

        it('does not add refs to anchors', async function () {
            const service = new OutboundLinkTagger({
                getSiteTitle: () => 'Hello world',
                isEnabled: () => true,
                urlUtils: {
                    isSiteUrl: () => false
                }
            });
            const html = await service.addToHtml('<a href="#test">Hello world</a><a href="#">Hello world</a>');
            assert.equal(html, '<a href="#test">Hello world</a><a href="#">Hello world</a>');
        });

        it('does not add refs to relative links', async function () {
            const service = new OutboundLinkTagger({
                getSiteTitle: () => 'Hello world',
                isEnabled: () => true,
                urlUtils: {
                    isSiteUrl: () => false
                }
            });
            const html = await service.addToHtml('<a href="test">Hello world</a><a href="">Hello world</a>');
            assert.equal(html, '<a href="test">Hello world</a><a href>Hello world</a>');
        });

        it('keeps HTML if throws', async function () {
            const service = new OutboundLinkTagger({
                getSiteTitle: () => 'Hello world',
                isEnabled: () => true,
                urlUtils: {
                    isSiteUrl: () => {
                        throw new Error('Oops!');
                    }
                }
            });
            const html = await service.addToHtml('<a href="https://example.com/test-site">Hello world</a><a href="https://other.com/test/">Hello world</a>');
            assert.equal(html, '<a href="https://example.com/test-site">Hello world</a><a href="https://other.com/test/">Hello world</a>');
        });

        it('keeps HTML comments', async function () {
            const service = new OutboundLinkTagger({
                getSiteTitle: () => 'Hello world',
                isEnabled: () => true,
                urlUtils: {
                    isSiteUrl: () => false
                }
            });
            const html = await service.addToHtml('<!-- comment -->');
            assert.equal(html, '<!-- comment -->');
        });
    });
});
