import Pretender from 'pretender';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupTest} from 'ember-mocha';

describe('Integration: Service: lazy-loader', function () {
    setupTest();

    let server;

    beforeEach(function () {
        server = new Pretender();
    });

    afterEach(function () {
        server.shutdown();
    });

    it('loads a script correctly and only once', async function () {
        let subject = this.owner.lookup('service:lazy-loader');

        subject.setProperties({
            scriptPromises: {},
            testing: false
        });

        // first load should add script element
        await subject.loadScript('test', 'lazy-test.js')
            .then(() => {})
            .catch(() => {});

        let scripts = document.querySelectorAll('script[src$="lazy-test.js"]');
        expect(scripts.length, 'no of script tags on first load').to.equal(1);
        expect(scripts[0].src).to.match(/^https?:\/\//);
        expect(scripts[0].src).to.include('lazy-test.js');

        // second load should not add another script element
        await subject.loadScript('test', 'lazy-test.js')
            .then(() => { })
            .catch(() => { });

        scripts = document.querySelectorAll('script[src$="lazy-test.js"]');
        expect(scripts.length, 'no of script tags on second load').to.equal(1);
    });

    it('loads styles correctly', function () {
        let subject = this.owner.lookup('service:lazy-loader');

        subject.setProperties({
            testing: false
        });

        return subject.loadStyle('testing', 'style.css').catch(() => {
            // we add a catch handler here because the style.css doesn't exist
            expect(document.querySelectorAll('#testing-styles').length).to.equal(1);
            const href = document.querySelector('#testing-styles').getAttribute('href');
            expect(href).to.match(/^https?:\/\//);
            expect(href).to.include('style.css');
        });
    });

    it('does not double-prefix URLs already rewritten by broccoli-asset-rev', async function () {
        // broccoli-asset-rev rewrites string literals in compiled JS at build
        // time, prepending the CDN origin. When the lazy-loader receives an
        // already-absolute URL it must use it as-is.
        let subject = this.owner.lookup('service:lazy-loader');

        subject.setProperties({
            scriptPromises: {},
            testing: false
        });

        const cdnUrl = 'https://assets.ghost.io/admin-forward/assets/ghost-dark-abc123.css';

        await subject.loadStyle('dark-cdn-test', cdnUrl, true).catch(() => {});

        const link = document.querySelector('#dark-cdn-test-styles');
        expect(link).to.exist;
        expect(link.getAttribute('href')).to.equal(cdnUrl);
    });
});
