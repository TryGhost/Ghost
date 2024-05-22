import Pretender from 'pretender';
import ghostPaths from 'ghost-admin/utils/ghost-paths';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupTest} from 'ember-mocha';

describe('Integration: Adapter: tag', function () {
    setupTest();

    let server, store;

    beforeEach(function () {
        store = this.owner.lookup('service:store');
        server = new Pretender();
    });

    afterEach(function () {
        server.shutdown();
    });

    it('loads tags from regular endpoint when all are fetched', function (done) {
        server.get(`${ghostPaths().apiRoot}/tags/`, function () {
            return [200, {'Content-Type': 'application/json'}, JSON.stringify({tags: [
                {
                    id: 1,
                    name: 'Tag 1',
                    slug: 'tag-1'
                }, {
                    id: 2,
                    name: 'Tag 2',
                    slug: 'tag-2'
                }
            ]})];
        });

        store.findAll('tag', {reload: true}).then((tags) => {
            expect(tags).to.be.ok;
            expect(tags.objectAtContent(0).get('name')).to.equal('Tag 1');
            done();
        });
    });

    it('loads tag from slug endpoint when single tag is queried and slug is passed in', function (done) {
        server.get(`${ghostPaths().apiRoot}/tags/slug/tag-1/`, function () {
            return [200, {'Content-Type': 'application/json'}, JSON.stringify({tags: [
                {
                    id: 1,
                    slug: 'tag-1',
                    name: 'Tag 1'
                }
            ]})];
        });

        store.queryRecord('tag', {slug: 'tag-1'}).then((tag) => {
            expect(tag).to.be.ok;
            expect(tag.get('name')).to.equal('Tag 1');
            done();
        });
    });
});
