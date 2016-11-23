import {expect} from 'chai';
import {describe, it} from 'mocha';
import {setupTest} from 'ember-mocha';
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

describe('Integration: Service: time-zone', function () {
    setupTest('service:time-zone', {
        integration: true
    });

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
});
