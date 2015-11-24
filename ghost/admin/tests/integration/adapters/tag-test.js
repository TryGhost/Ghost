/* jshint expr:true */
import { expect } from 'chai';
import {
    describeModule,
    it
} from 'ember-mocha';
import Pretender from 'pretender';

describeModule(
    'adapter:tag',
    'Integration: Adapter: tag',
    {
        integration: true
    },
    function () {
        let server, store;

        beforeEach(function () {
            store = this.container.lookup('service:store');
            server = new Pretender();
        });

        afterEach(function () {
            server.shutdown();
        });

        it('loads tags from regular endpoint when all are fetched', function (done) {
            server.get('/ghost/api/v0.1/tags/', function () {
                return [200, {'Content-Type': 'application/json'}, JSON.stringify({tags: [{
                    id: 1,
                    name: 'Tag 1',
                    slug: 'tag-1'
                }, {
                    id: 2,
                    name: 'Tag 2',
                    slug: 'tag-2'
                }]})];
            });

            store.findAll('tag', {reload: true}).then((tags) => {
                expect(tags).to.be.ok;
                expect(tags.objectAtContent(0).get('name')).to.equal('Tag 1');
                done();
            });
        });

        it('loads tag from slug endpoint when single tag is queried and slug is passed in', function (done) {
            server.get('/ghost/api/v0.1/tags/slug/tag-1/', function () {
                return [200, {'Content-Type': 'application/json'}, JSON.stringify({tags: [{
                    id: 1,
                    slug: 'tag-1',
                    name: 'Tag 1'
                }]})];
            });

            store.queryRecord('tag', {slug: 'tag-1'}).then((tag) => {
                expect(tag).to.be.ok;
                expect(tag.get('name')).to.equal('Tag 1');
                done();
            });
        });
    }
);
