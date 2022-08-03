import hbs from 'htmlbars-inline-precompile';
import {blur, click, fillIn, find, findAll, render, triggerKeyEvent} from '@ember/test-helpers';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupRenderingTest} from 'ember-mocha';

// we want baseUrl to match the running domain so relative URLs are
// handled as expected (browser auto-sets the domain when using a.href)
let currentUrl = `${window.location.protocol}//${window.location.host}/`;

describe('Integration: Component: gh-navitem-url-input', function () {
    setupRenderingTest();

    beforeEach(function () {
        // set defaults
        this.set('baseUrl', currentUrl);
        this.set('url', '');
        this.set('isNew', false);
        this.set('clearErrors', function () {
            return null;
        });
    });

    it('renders correctly with blank url', async function () {
        await render(hbs`
            {{gh-navitem-url-input baseUrl=baseUrl url=url isNew=isNew clearErrors=(action clearErrors)}}
        `);

        expect(findAll('input')).to.have.length(1);
        expect(find('input')).to.have.class('gh-input');
        expect(find('input')).to.have.value(currentUrl);
    });

    it('renders correctly with relative urls', async function () {
        this.set('url', '/about');
        await render(hbs`
            {{gh-navitem-url-input baseUrl=baseUrl url=url isNew=isNew clearErrors=(action clearErrors)}}
        `);

        expect(find('input')).to.have.value(`${currentUrl}about`);

        this.set('url', '/about#contact');
        expect(find('input')).to.have.value(`${currentUrl}about#contact`);
    });

    it('renders correctly with absolute urls', async function () {
        this.set('url', 'https://example.com:2368/#test');
        await render(hbs`
            {{gh-navitem-url-input baseUrl=baseUrl url=url isNew=isNew clearErrors=(action clearErrors)}}
        `);

        expect(find('input')).to.have.value('https://example.com:2368/#test');

        this.set('url', 'mailto:test@example.com');
        expect(find('input')).to.have.value('mailto:test@example.com');

        this.set('url', 'tel:01234-5678-90');
        expect(find('input')).to.have.value('tel:01234-5678-90');

        this.set('url', '//protocol-less-url.com');
        expect(find('input')).to.have.value('//protocol-less-url.com');

        this.set('url', '#anchor');
        expect(find('input')).to.have.value('#anchor');
    });

    it('deletes base URL on backspace', async function () {
        await render(hbs`
            {{gh-navitem-url-input baseUrl=baseUrl url=url isNew=isNew clearErrors=(action clearErrors)}}
        `);

        expect(find('input')).to.have.value(currentUrl);
        await triggerKeyEvent('input', 'keydown', 8);
        expect(find('input')).to.have.value('');
    });

    it('deletes base URL on delete', async function () {
        await render(hbs`
            {{gh-navitem-url-input baseUrl=baseUrl url=url isNew=isNew clearErrors=(action clearErrors)}}
        `);

        expect(find('input')).to.have.value(currentUrl);
        await triggerKeyEvent('input', 'keydown', 46);
        expect(find('input')).to.have.value('');
    });

    it('adds base url to relative urls on blur', async function () {
        this.set('updateUrl', val => val);
        await render(hbs`
            {{gh-navitem-url-input baseUrl=baseUrl url=url isNew=isNew update=(action updateUrl) clearErrors=(action clearErrors)}}
        `);

        await fillIn('input', '/about');
        await blur('input');

        expect(find('input')).to.have.value(`${currentUrl}about/`);
    });

    it('adds "mailto:" to email addresses on blur', async function () {
        this.set('updateUrl', val => val);
        await render(hbs`
            {{gh-navitem-url-input baseUrl=baseUrl url=url isNew=isNew update=(action updateUrl) clearErrors=(action clearErrors)}}
        `);

        await fillIn('input', 'test@example.com');
        await blur('input');

        expect(find('input')).to.have.value('mailto:test@example.com');

        // ensure we don't double-up on the mailto:
        await blur('input');
        expect(find('input')).to.have.value('mailto:test@example.com');
    });

    it('doesn\'t add base url to invalid urls on blur', async function () {
        this.set('updateUrl', val => val);
        await render(hbs`
            {{gh-navitem-url-input baseUrl=baseUrl url=url isNew=isNew update=(action updateUrl) clearErrors=(action clearErrors)}}
        `);

        let changeValue = async (value) => {
            await fillIn('input', value);
            await blur('input');
        };

        await changeValue('with spaces');
        expect(find('input')).to.have.value('with spaces');

        await changeValue('/with spaces');
        expect(find('input')).to.have.value('/with spaces');
    });

    it('doesn\'t mangle invalid urls on blur', async function () {
        this.set('updateUrl', val => val);
        await render(hbs`
            {{gh-navitem-url-input baseUrl=baseUrl url=url isNew=isNew update=(action updateUrl) clearErrors=(action clearErrors)}}
        `);

        await fillIn('input', `${currentUrl} /test`);
        await blur('input');

        expect(find('input')).to.have.value(`${currentUrl} /test`);
    });

    // https://github.com/TryGhost/Ghost/issues/9373
    it('doesn\'t mangle urls when baseUrl has unicode characters', async function () {
        this.set('updateUrl', val => val);

        this.set('baseUrl', 'http://exämple.com');

        await render(hbs`
            {{gh-navitem-url-input baseUrl=baseUrl url=url isNew=isNew update=(action updateUrl) clearErrors=(action clearErrors)}}
        `);
        await fillIn('input', `${currentUrl}/test`);
        await blur('input');

        expect(find('input')).to.have.value(`${currentUrl}/test`);
    });

    it('triggers "update" action on blur', async function () {
        let changeActionCallCount = 0;
        this.set('updateUrl', (val) => {
            changeActionCallCount += 1;
            return val;
        });

        await render(hbs `
            {{gh-navitem-url-input baseUrl=baseUrl url=url isNew=isNew update=(action updateUrl) clearErrors=(action clearErrors)}}
        `);
        await click('input');
        await blur('input');

        expect(changeActionCallCount).to.equal(1);
    });

    it('triggers "update" action on enter', async function () {
        let changeActionCallCount = 0;
        this.set('updateUrl', (val) => {
            changeActionCallCount += 1;
            return val;
        });

        await render(hbs `
            {{gh-navitem-url-input baseUrl=baseUrl url=url isNew=isNew update=(action updateUrl) clearErrors=(action clearErrors)}}
        `);
        await triggerKeyEvent('input', 'keypress', 13);

        expect(changeActionCallCount).to.equal(1);
    });

    it('triggers "update" action on CMD-S', async function () {
        let changeActionCallCount = 0;
        this.set('updateUrl', (val) => {
            changeActionCallCount += 1;
            return val;
        });

        await render(hbs `
            {{gh-navitem-url-input baseUrl=baseUrl url=url isNew=isNew update=(action updateUrl) clearErrors=(action clearErrors)}}
        `);
        await triggerKeyEvent('input', 'keydown', 83, {
            metaKey: true
        });

        expect(changeActionCallCount).to.equal(1);
    });

    it('sends absolute urls straight through to update action', async function () {
        let lastSeenUrl = '';

        this.set('updateUrl', (url) => {
            lastSeenUrl = url;
            return url;
        });

        await render(hbs `
            {{gh-navitem-url-input baseUrl=baseUrl url=url isNew=isNew update=(action updateUrl) clearErrors=(action clearErrors)}}
        `);

        let testUrl = async (url) => {
            await fillIn('input', url);
            await blur('input');
            expect(lastSeenUrl).to.equal(url);
        };

        await testUrl('http://example.com');
        await testUrl('http://example.com/');
        await testUrl('https://example.com');
        await testUrl('//example.com');
        await testUrl('//localhost:1234');
        await testUrl('#anchor');
        await testUrl('mailto:test@example.com');
        await testUrl('tel:12345-567890');
        await testUrl('javascript:alert("testing");');
    });

    it('strips base url from relative urls before sending to update action', async function () {
        let lastSeenUrl = '';

        this.set('updateUrl', (url) => {
            lastSeenUrl = url;
            return url;
        });

        await render(hbs `
            {{gh-navitem-url-input baseUrl=baseUrl url=url isNew=isNew update=(action updateUrl) clearErrors=(action clearErrors)}}
        `);

        let testUrl = async (url) => {
            await fillIn('input', `${currentUrl}${url}`);
            await blur('input');
            expect(lastSeenUrl).to.equal(`/${url}`);
        };

        await testUrl('about/');
        await testUrl('about#contact');
        await testUrl('test/nested/');
    });

    it('handles links to subdomains of blog domain', async function () {
        let expectedUrl = '';

        this.set('baseUrl', 'http://example.com/');

        this.set('updateUrl', (url) => {
            expect(url).to.equal(expectedUrl);
            return url;
        });

        await render(hbs `
            {{gh-navitem-url-input baseUrl=baseUrl url=url isNew=isNew update=(action updateUrl) clearErrors=(action clearErrors)}}
        `);

        expectedUrl = 'http://test.example.com/';
        await fillIn('input', expectedUrl);
        await blur('input');
        expect(find('input')).to.have.value(expectedUrl);
    });

    it('adds trailing slash to relative URL', async function () {
        let lastSeenUrl = '';

        this.set('updateUrl', (url) => {
            lastSeenUrl = url;
            return url;
        });

        await render(hbs `
            {{gh-navitem-url-input baseUrl=baseUrl url=url isNew=isNew update=(action updateUrl) clearErrors=(action clearErrors)}}
        `);

        let testUrl = async (url) => {
            await fillIn('input', `${currentUrl}${url}`);
            await blur('input');
            expect(lastSeenUrl).to.equal(`/${url}/`);
        };

        await testUrl('about');
        await testUrl('test/nested');
    });

    it('does not add trailing slash on relative URL with [.?#]', async function () {
        let lastSeenUrl = '';

        this.set('updateUrl', (url) => {
            lastSeenUrl = url;
            return url;
        });

        await render(hbs `
            {{gh-navitem-url-input baseUrl=baseUrl url=url isNew=isNew update=(action updateUrl) clearErrors=(action clearErrors)}}
        `);

        let testUrl = async (url) => {
            await fillIn('input', `${currentUrl}${url}`);
            await blur('input');
            expect(lastSeenUrl).to.equal(`/${url}`);
        };

        await testUrl('about#contact');
        await testUrl('test/nested.svg');
        await testUrl('test?gho=sties');
        await testUrl('test/nested?sli=mer');
    });

    it('does not add trailing slash on non-relative URLs', async function () {
        let lastSeenUrl = '';

        this.set('updateUrl', (url) => {
            lastSeenUrl = url;
            return url;
        });

        await render(hbs `
            {{gh-navitem-url-input baseUrl=baseUrl url=url isNew=isNew update=(action updateUrl) clearErrors=(action clearErrors)}}
        `);

        let testUrl = async (url) => {
            await fillIn('input', url);
            await blur('input');
            expect(lastSeenUrl).to.equal(url);
        };

        await testUrl('http://woo.ff/test');
        await testUrl('http://me.ow:2342/nested/test');
        await testUrl('https://wro.om/car#race');
        await testUrl('https://kabo.om/explosion?really=now');
    });

    describe('with sub-folder baseUrl', function () {
        beforeEach(function () {
            this.set('baseUrl', `${currentUrl}blog/`);
        });

        it('handles URLs relative to base url', async function () {
            let lastSeenUrl = '';

            this.set('updateUrl', (url) => {
                lastSeenUrl = url;
                return url;
            });

            await render(hbs `
                {{gh-navitem-url-input baseUrl=baseUrl url=url isNew=isNew update=(action updateUrl) clearErrors=(action clearErrors)}}
            `);

            let testUrl = async (url) => {
                await fillIn('input', `${currentUrl}blog${url}`);
                await blur('input');
                expect(lastSeenUrl).to.equal(url);
            };

            await testUrl('/about/');
            await testUrl('/about#contact');
            await testUrl('/test/nested/');
        });

        it('handles URLs relative to base host', async function () {
            let lastSeenUrl = '';

            this.set('updateUrl', (url) => {
                lastSeenUrl = url;
                return url;
            });

            await render(hbs `
                {{gh-navitem-url-input baseUrl=baseUrl url=url isNew=isNew update=(action updateUrl) clearErrors=(action clearErrors)}}
            `);

            let testUrl = async (url) => {
                await fillIn('input', url);
                await blur('input');
                expect(lastSeenUrl).to.equal(url);
            };

            await testUrl(`http://${window.location.host}`);
            await testUrl(`https://${window.location.host}`);
            await testUrl(`http://${window.location.host}/`);
            await testUrl(`https://${window.location.host}/`);
            await testUrl(`http://${window.location.host}/test`);
            await testUrl(`https://${window.location.host}/test`);
            await testUrl(`http://${window.location.host}/#test`);
            await testUrl(`https://${window.location.host}/#test`);
            await testUrl(`http://${window.location.host}/another/folder`);
            await testUrl(`https://${window.location.host}/another/folder`);
        });
    });
});
