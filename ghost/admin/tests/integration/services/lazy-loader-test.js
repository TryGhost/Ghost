import Pretender from 'pretender';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupTest} from 'ember-mocha';

describe('Integration: Service: lazy-loader', function () {
    setupTest();

    let server;
    let ghostPaths = {
        adminRoot: '/assets/'
    };

    beforeEach(function () {
        server = new Pretender();
    });

    afterEach(function () {
        server.shutdown();
    });

    it('loads a script correctly and only once', async function () {
        let subject = this.owner.lookup('service:lazy-loader');

        subject.setProperties({
            ghostPaths,
            scriptPromises: {},
            testing: false
        });

        // first load should add script element
        await subject.loadScript('test', 'lazy-test.js')
            .then(() => {})
            .catch(() => {});

        expect(
            document.querySelectorAll('script[src="/assets/lazy-test.js"]').length,
            'no of script tags on first load'
        ).to.equal(1);

        // second load should not add another script element
        await subject.loadScript('test', '/assets/lazy-test.js')
            .then(() => { })
            .catch(() => { });

        expect(
            document.querySelectorAll('script[src="/assets/lazy-test.js"]').length,
            'no of script tags on second load'
        ).to.equal(1);
    });

    it('loads styles correctly', function () {
        let subject = this.owner.lookup('service:lazy-loader');

        subject.setProperties({
            ghostPaths,
            testing: false
        });

        return subject.loadStyle('testing', 'style.css').catch(() => {
            // we add a catch handler here because `/assets/style.css` doesn't exist
            expect(document.querySelectorAll('#testing-styles').length).to.equal(1);
            expect(document.querySelector('#testing-styles').getAttribute('href')).to.equal('/assets/style.css');
        });
    });
});
