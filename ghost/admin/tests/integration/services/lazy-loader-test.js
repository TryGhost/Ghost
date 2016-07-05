/* jshint expr:true */
import { expect } from 'chai';
import {
    describeModule,
    it
} from 'ember-mocha';
import Pretender from 'pretender';
import RSVP from 'rsvp';
import $ from 'jquery';

describeModule(
    'service:lazy-loader',
    'Integration: Service: lazy-loader',
    {integration: true},
    function() {
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

        it('loads a script correctly and only once', function (done) {
            let subject = this.subject({
                ghostPaths,
                scriptPromises: {},
                testing: false
            });

            server.get('/assets/test.js', function ({requestHeaders}) {
                expect(requestHeaders.Accept).to.match(/text\/javascript/);

                return [200, {'Content-Type': 'text/javascript'}, 'window.testLoadScript = \'testvalue\''];
            });

            subject.loadScript('test-script', 'test.js').then(() => {
                expect(subject.get('scriptPromises.test-script')).to.exist;
                expect(window.testLoadScript).to.equal('testvalue');
                expect(server.handlers[0].numberOfCalls).to.equal(1);

                return subject.loadScript('test-script', 'test.js');
            }).then(() => {
                expect(server.handlers[0].numberOfCalls).to.equal(1);

                done();
            });
        });

        it('loads styles correctly', function () {
            let subject = this.subject({
                ghostPaths,
                testing: false
            });

            subject.loadStyle('testing', 'style.css');

            expect($('#testing-styles').length).to.equal(1);
            expect($('#testing-styles').attr('href')).to.equal('/assets/style.css');
        });
    }
);
