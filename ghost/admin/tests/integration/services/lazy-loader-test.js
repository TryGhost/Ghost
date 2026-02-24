import Pretender from 'pretender';
import assetBase from 'ghost-admin/utils/asset-base';
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

        const expectedSrc = `${assetBase()}lazy-test.js`;

        // first load should add script element
        await subject.loadScript('test', 'lazy-test.js')
            .then(() => {})
            .catch(() => {});

        expect(
            document.querySelectorAll(`script[src="${expectedSrc}"]`).length,
            'no of script tags on first load'
        ).to.equal(1);

        // second load should not add another script element
        await subject.loadScript('test', 'lazy-test.js')
            .then(() => { })
            .catch(() => { });

        expect(
            document.querySelectorAll(`script[src="${expectedSrc}"]`).length,
            'no of script tags on second load'
        ).to.equal(1);
    });

    it('loads styles correctly', function () {
        let subject = this.owner.lookup('service:lazy-loader');

        subject.setProperties({
            testing: false
        });

        const expectedHref = `${assetBase()}style.css`;

        return subject.loadStyle('testing', 'style.css').catch(() => {
            // we add a catch handler here because the style.css doesn't exist
            expect(document.querySelectorAll('#testing-styles').length).to.equal(1);
            expect(document.querySelector('#testing-styles').getAttribute('href')).to.equal(expectedHref);
        });
    });
});
