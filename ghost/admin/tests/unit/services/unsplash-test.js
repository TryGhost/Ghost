import Pretender from 'pretender';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {run} from '@ember/runloop';
import {settled} from '@ember/test-helpers';
import {setupTest} from 'ember-mocha';

describe('Unit: Service: unsplash', function () {
    setupTest();

    let server;

    beforeEach(function () {
        server = new Pretender();
    });

    afterEach(function () {
        server.shutdown();
    });

    it('can load new');
    it('can load next page');

    describe('search', function () {
        it('sends search request');
        it('debounces query updates');
        it('can load next page of search results');
        it('clears photos when starting new search');
        it('loads new when query is cleared');
    });

    describe('columns', function () {
        it('sorts photos into columns based on column height');
        it('can change column count');
    });

    describe('error handling', function () {
        it('handles rate limit exceeded', async function () {
            server.get('https://api.unsplash.com/photos', function () {
                return [403, {'x-ratelimit-remaining': '0'}, 'Rate Limit Exceeded'];
            });

            let service = this.owner.lookup('service:unsplash');

            run(() => {
                service.loadNextPage();
            });
            await settled();

            expect(service.get('error')).to.have.string('Unsplash API rate limit reached');
        });

        it('handles json errors', async function () {
            server.get('https://api.unsplash.com/photos', function () {
                return [500, {'Content-Type': 'application/json'}, JSON.stringify({
                    errors: ['Unsplash API Error']
                })];
            });

            let service = this.owner.lookup('service:unsplash');

            run(() => {
                service.loadNextPage();
            });
            await settled();

            expect(service.get('error')).to.equal('Unsplash API Error');
        });

        it('handles text errors', async function () {
            server.get('https://api.unsplash.com/photos', function () {
                return [500, {'Content-Type': 'text/xml'}, 'Unsplash text error'];
            });

            let service = this.owner.lookup('service:unsplash');

            run(() => {
                service.loadNextPage();
            });
            await settled();

            expect(service.get('error')).to.equal('Unsplash text error');
        });
    });

    describe('isLoading', function () {
        it('is false by default');
        it('is true when loading new');
        it('is true when loading next page');
        it('is true when searching');
        it('returns to false when finished');
    });
});
