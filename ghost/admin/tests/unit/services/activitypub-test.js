import Pretender from 'pretender';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupTest} from 'ember-mocha';

describe('Unit: Service: activitypub', function () {
    setupTest();

    let server;

    beforeEach(function () {
        server = new Pretender();
    });

    afterEach(function () {
        server.shutdown();
    });

    describe('fetchFollowerCount', function () {
        it('returns 0 when no token is available', async function () {
            server.get('/ghost/api/admin/identities/', function () {
                return [200, {'Content-Type': 'application/json'}, JSON.stringify({
                    identities: []
                })];
            });

            const service = this.owner.lookup('service:activitypub');
            const count = await service.fetchFollowerCount();

            expect(count).to.equal(0);
        });

        it('returns 0 when no site URL is available', async function () {
            server.get('/ghost/api/admin/identities/', function () {
                return [200, {'Content-Type': 'application/json'}, JSON.stringify({
                    identities: [{token: 'test-token'}]
                })];
            });

            server.get('/ghost/api/admin/site', function () {
                return [200, {'Content-Type': 'application/json'}, JSON.stringify({
                    site: {}
                })];
            });

            const service = this.owner.lookup('service:activitypub');
            const count = await service.fetchFollowerCount();

            expect(count).to.equal(0);
        });

        it('fetches and returns count successfully', async function () {
            const siteUrl = 'https://example.com';
            const token = 'test-token';
            const expectedCount = 42;

            server.get('/ghost/api/admin/identities/', function () {
                return [200, {'Content-Type': 'application/json'}, JSON.stringify({
                    identities: [{token}]
                })];
            });

            server.get('/ghost/api/admin/site', function () {
                return [200, {'Content-Type': 'application/json'}, JSON.stringify({
                    site: {url: siteUrl}
                })];
            });

            server.get(`${siteUrl}/.ghost/activitypub/v1/account/me`, function (request) {
                expect(request.requestHeaders.Authorization).to.equal(`Bearer ${token}`);
                expect(request.requestHeaders.Accept).to.equal('application/activity+json');

                return [200, {'Content-Type': 'application/json'}, JSON.stringify({
                    followerCount: expectedCount
                })];
            });

            const service = this.owner.lookup('service:activitypub');
            const count = await service.fetchFollowerCount();

            expect(count).to.equal(expectedCount);
        });

        it('sends correct Authorization and Accept headers', async function () {
            const siteUrl = 'https://example.com';
            const token = 'test-token-123';

            server.get('/ghost/api/admin/identities/', function () {
                return [200, {'Content-Type': 'application/json'}, JSON.stringify({
                    identities: [{token}]
                })];
            });

            server.get('/ghost/api/admin/site', function () {
                return [200, {'Content-Type': 'application/json'}, JSON.stringify({
                    site: {url: siteUrl}
                })];
            });

            let headersCaptured = false;
            server.get(`${siteUrl}/.ghost/activitypub/v1/account/me`, function (request) {
                expect(request.requestHeaders.Authorization).to.equal(`Bearer ${token}`);
                expect(request.requestHeaders.Accept).to.equal('application/activity+json');
                headersCaptured = true;

                return [200, {'Content-Type': 'application/json'}, JSON.stringify({
                    followerCount: 10
                })];
            });

            const service = this.owner.lookup('service:activitypub');
            await service.fetchFollowerCount();

            expect(headersCaptured).to.be.true;
        });

        it('handles API errors gracefully (returns 0)', async function () {
            server.get('/ghost/api/admin/identities/', function () {
                return [500, {'Content-Type': 'application/json'}, JSON.stringify({
                    errors: [{message: 'Server error'}]
                })];
            });

            const service = this.owner.lookup('service:activitypub');
            const count = await service.fetchFollowerCount();

            expect(count).to.equal(0);
        });

        it('handles network failures gracefully', async function () {
            const siteUrl = 'https://example.com';
            const token = 'test-token';

            server.get('/ghost/api/admin/identities/', function () {
                return [200, {'Content-Type': 'application/json'}, JSON.stringify({
                    identities: [{token}]
                })];
            });

            server.get('/ghost/api/admin/site', function () {
                return [200, {'Content-Type': 'application/json'}, JSON.stringify({
                    site: {url: siteUrl}
                })];
            });

            server.get(`${siteUrl}/.ghost/activitypub/v1/account/me`, function () {
                return [500, {'Content-Type': 'application/json'}, JSON.stringify({
                    errors: [{message: 'Network error'}]
                })];
            });

            const service = this.owner.lookup('service:activitypub');
            const count = await service.fetchFollowerCount();

            expect(count).to.equal(0);
        });

        it('returns 0 when followerCount is missing from response', async function () {
            const siteUrl = 'https://example.com';
            const token = 'test-token';

            server.get('/ghost/api/admin/identities/', function () {
                return [200, {'Content-Type': 'application/json'}, JSON.stringify({
                    identities: [{token}]
                })];
            });

            server.get('/ghost/api/admin/site', function () {
                return [200, {'Content-Type': 'application/json'}, JSON.stringify({
                    site: {url: siteUrl}
                })];
            });

            server.get(`${siteUrl}/.ghost/activitypub/v1/account/me`, function () {
                return [200, {'Content-Type': 'application/json'}, JSON.stringify({})];
            });

            const service = this.owner.lookup('service:activitypub');
            const count = await service.fetchFollowerCount();

            expect(count).to.equal(0);
        });
    });
});
