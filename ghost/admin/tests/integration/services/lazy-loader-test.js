import $ from 'jquery';
import Pretender from 'pretender';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupTest} from 'ember-mocha';

describe('Integration: Service: lazy-loader', function () {
    setupTest('service:lazy-loader', {integration: true});
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

    it('loads a script correctly and only once', function () {
        let subject = this.subject({
            ghostPaths,
            scriptPromises: {},
            testing: false
        });

        server.get('/assets/test.js', function ({requestHeaders}) {
            expect(requestHeaders.Accept).to.match(/text\/javascript/);

            return [200, {'Content-Type': 'text/javascript'}, 'window.testLoadScript = \'testvalue\''];
        });

        return subject.loadScript('test-script', 'test.js').then(() => {
            expect(subject.get('scriptPromises.test-script')).to.exist;
            expect(window.testLoadScript).to.equal('testvalue');
            expect(server.handlers[0].numberOfCalls).to.equal(1);

            return subject.loadScript('test-script', 'test.js');
        }).then(() => {
            expect(server.handlers[0].numberOfCalls).to.equal(1);
        });
    });

    it('loads styles correctly', function () {
        let subject = this.subject({
            ghostPaths,
            testing: false
        });

        return subject.loadStyle('testing', 'style.css').catch(() => {
            // we add a catch handler here because `/assets/style.css` doesn't exist
            expect($('#testing-styles').length).to.equal(1);
            expect($('#testing-styles').attr('href')).to.equal('/assets/style.css');
        });
    });
});
