import Pretender from 'pretender';
import config from 'ghost-admin/config/environment';
import ghostPaths from 'ghost-admin/utils/ghost-paths';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupTest} from 'ember-mocha';

describe('Integration: Service: store', function () {
    setupTest();

    let server;

    beforeEach(function () {
        server = new Pretender();
    });

    afterEach(function () {
        server.shutdown();
    });

    it('adds Ghost version header to requests', function (done) {
        let {version} = config.APP;
        let store = this.owner.lookup('service:store');

        server.get(`${ghostPaths().apiRoot}/posts/1/`, function () {
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
