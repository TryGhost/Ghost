import { expect } from 'chai';
import {
    describeModule,
    it
} from 'ember-mocha';
import Pretender from 'pretender';
import Ember from 'ember';

function settingsStub(server) {
    let settings = [
        {
            id: '1',
            type: 'blog',
            key: 'activeTimezone',
            value: 'Africa/Cairo'
        }
    ];

    server.get('/ghost/api/v0.1/settings/', function () {
        return [200, {'Content-Type': 'application/json'}, JSON.stringify({settings})];
    });
}

describeModule(
    'service:time-zone',
    'Integration: Service: time-zone',
    {
        integration: true
    },
    function () {
        let server;

        beforeEach(function () {
            server = new Pretender();
        });

        afterEach(function () {
            server.shutdown();
        });

        it('should return a timezone offset', function (done) {
            let service = this.subject();

            settingsStub(server);

            service.get('offset').then(function (offset) {
                expect(offset).to.equal('Africa/Cairo');
                done();
            });
        });
    }
);
