import Pretender from 'pretender';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupTest} from 'ember-mocha';

describe('Unit: Service: notifications-count', function () {
    setupTest();

    let server;

    beforeEach(function () {
        server = new Pretender();
    });

    afterEach(function () {
        server.shutdown();
    });

    it('initializes with correct default values', function () {
        const service = this.owner.lookup('service:notifications-count');
        expect(service.count).to.equal(0);
        expect(service.isLoading).to.equal(false);
    });

    it('updates count correctly', function () {
        const service = this.owner.lookup('service:notifications-count');
        service.updateCount(5);
        expect(service.count).to.equal(5);
    });

    describe('fetchCount', function () {
        it('returns 0 when no token is available', async function () {
            server.get('/ghost/api/admin/identities/', function () {
                return [200, {'Content-Type': 'application/json'}, JSON.stringify({
                    identities: []
                })];
            });

            const service = this.owner.lookup('service:notifications-count');
            const count = await service.fetchCount();
            
            expect(count).to.equal(0);
            expect(service.count).to.equal(0);
            expect(service.isLoading).to.equal(false);
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

            const service = this.owner.lookup('service:notifications-count');
            const count = await service.fetchCount();
            
            expect(count).to.equal(0);
            expect(service.count).to.equal(0);
            expect(service.isLoading).to.equal(false);
        });

        it('fetches and updates count successfully', async function () {
            const siteUrl = 'https://example.com';
            const token = 'test-token';
            const expectedCount = 5;

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

            server.get(`${siteUrl}/.ghost/activitypub/v1/notifications/unread/count`, function (request) {
                expect(request.requestHeaders.Authorization).to.equal(`Bearer ${token}`);
                expect(request.requestHeaders.Accept).to.equal('application/activity+json');
                
                return [200, {'Content-Type': 'application/json'}, JSON.stringify({
                    count: expectedCount
                })];
            });

            const service = this.owner.lookup('service:notifications-count');
            const count = await service.fetchCount();
            
            expect(count).to.equal(expectedCount);
            expect(service.count).to.equal(expectedCount);
            expect(service.isLoading).to.equal(false);
        });

        it('handles errors gracefully', async function () {
            server.get('/ghost/api/admin/identities/', function () {
                return [500, {'Content-Type': 'application/json'}, JSON.stringify({
                    errors: [{message: 'Server error'}]
                })];
            });

            const service = this.owner.lookup('service:notifications-count');
            const count = await service.fetchCount();
            
            expect(count).to.equal(0);
            expect(service.count).to.equal(0);
            expect(service.isLoading).to.equal(false);
        });

        it('sets loading state correctly during fetch', async function () {
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

            server.get(`${siteUrl}/.ghost/activitypub/v1/notifications/unread/count`, function () {
                return [200, {'Content-Type': 'application/json'}, JSON.stringify({
                    count: 5
                })];
            });

            const service = this.owner.lookup('service:notifications-count');

            const fetchPromise = service.fetchCount();

            expect(service.isLoading).to.equal(true);

            await fetchPromise;

            expect(service.isLoading).to.equal(false);
        });
    });
});
