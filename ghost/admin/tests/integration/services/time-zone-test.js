import { expect } from 'chai';
import {
    describeModule,
    it
} from 'ember-mocha';
import Pretender from 'pretender';

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

        it('should return the blogs timezone', function (done) {
            let service = this.subject();

            settingsStub(server);

            service.get('blogTimezone').then(function (blogTimezone) {
                expect(blogTimezone).to.equal('Africa/Cairo');
                done();
            });
        });
    }
);
