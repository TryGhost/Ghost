import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupMirage} from 'ember-cli-mirage/test-support';
import {setupTest} from 'ember-mocha';

describe('Integration: Service: search', function () {
    const hooks = setupTest();
    setupMirage(hooks);

    let search;
    // eslint-disable-next-line no-unused-vars
    let firstUser, firstPost, secondPost, firstPage, firstTag;

    beforeEach(function () {
        search = this.owner.lookup('service:search');

        // populate store with data we'll be searching
        firstPost = this.server.create('post', {title: 'First post', slug: 'first-post', visibility: 'members', publishedAt: '2024-05-08T16:21:07.000Z'});
        secondPost = this.server.create('post', {title: 'Second post', slug: 'second-post'});
        firstPage = this.server.create('page', {title: 'First page', slug: 'first-page'});
        firstTag = this.server.create('tag', {name: 'First tag', slug: 'first-tag'});
    });

    it('returns additional post-related fields', async function () {
        const results = await search.searchTask.perform('post');

        expect(results[0].options[0].visibility).to.equal('members');
        expect(results[0].options[0].publishedAt).to.equal('2024-05-08T16:21:07.000Z');
    });
});
