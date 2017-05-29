import Pretender from 'pretender';
import config from 'ghost-admin/config/environment';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupTest} from 'ember-mocha';

describe('Integration: Service: store', function () {
    setupTest('service:store', {
        integration: true
    });

    let server;

    beforeEach(function () {
        server = new Pretender();
    });

    afterEach(function () {
        server.shutdown();
    });

    it('adds Ghost version header to requests', function (done) {
        let {version} = config.APP;
        let store = this.subject();

        server.get('/ghost/api/v0.1/posts/1/', function () {
            return [
                404,
                {'Content-Type': 'application/json'},
                JSON.stringify({})
            ];
        });

        store.find('post', 1).catch(() => {
            let [request] = server.handledRequests;
            expect(request.requestHeaders['X-Ghost-Version']).to.equal(version);
            done();
        });
    });
});
