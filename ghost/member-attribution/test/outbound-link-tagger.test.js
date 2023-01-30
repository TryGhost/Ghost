// Switch these lines once there are useful utils
// const testUtils = require('./utils');
require('./utils');
const {OutboundLinkTagger} = require('../');

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

        it('does not add ref to blacklisted domains', async function () {
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
});
