import Pretender from 'pretender';
import ghostPaths from 'ghost-admin/utils/ghost-paths';
import {dasherize} from '@ember/string';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupTest} from 'ember-mocha';

function stubSlugEndpoint(server, type, slug) {
    server.get(`${ghostPaths().apiRoot}/slugs/:type/:slug/`, function (request) {
        expect(request.params.type).to.equal(type);
        expect(request.params.slug).to.equal(slug);

        return [
            200,
            {'Content-Type': 'application/json'},
            JSON.stringify({slugs: [{slug: dasherize(slug)}]})
        ];
    });
}

describe('Integration: Service: slug-generator', function () {
    setupTest();

    let server;

    beforeEach(function () {
        server = new Pretender();
    });

    afterEach(function () {
        server.shutdown();
    });

    it('returns empty if no slug is provided', function (done) {
        let service = this.owner.lookup('service:slug-generator');

        service.generateSlug('post', '').then(function (slug) {
            expect(slug).to.equal('');
            done();
        });
    });

    it('calls correct endpoint and returns correct data', function (done) {
        let rawSlug = 'a test post';
        stubSlugEndpoint(server, 'post', rawSlug);

        let service = this.owner.lookup('service:slug-generator');

        service.generateSlug('post', rawSlug).then(function (slug) {
            expect(slug).to.equal(dasherize(rawSlug));
            done();
        });
    });
});
