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
        const subject = this.owner.lookup('service:lazy-loader');

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
});
