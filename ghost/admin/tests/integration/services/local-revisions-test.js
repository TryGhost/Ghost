import Pretender from 'pretender';
import ghostPaths from 'ghost-admin/utils/ghost-paths';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupTest} from 'ember-mocha';

function stubCreatePostEndpoint(server) {
    server.post(`${ghostPaths().apiRoot}/posts/`, function () {
        return [
            201,
            {'Content-Type': 'application/json'},
            JSON.stringify({posts: [{
                id: 'test id',
                lexical: 'test lexical string',
                title: 'test title',
                post_revisions: []
            }]})
        ];
    });

    server.get(`${ghostPaths().apiRoot}/users/`, function () {
        return [
            200,
            {'Content-Type': 'application/json'},
            JSON.stringify({users: [{
                id: '1',
                name: 'test name',
                roles: ['owner']
            }]})
        ];
    });
}

describe('Integration: Service: local-revisions', function () {
    setupTest();

    let server;

    beforeEach(function () {
        server = new Pretender();
        this.service = this.owner.lookup('service:local-revisions');
        this.service.clear();
    });

    afterEach(function () {
        server.shutdown();
    });

    it('restores a post from a revision', async function () {
        stubCreatePostEndpoint(server);
        // create a post to restore
        const key = this.service.performSave('post', {id: 'test-id', authors: [{id: '1'}], lexical: '{"root":{"children":[{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"\\"{\\\\\\"root\\\\\\":{\\\\\\"children\\\\\\":[{\\\\\\"children\\\\\\":[{\\\\\\"detail\\\\\\":0,\\\\\\"format\\\\\\":0,\\\\\\"mode\\\\\\":\\\\\\"normal\\\\\\",\\\\\\"style\\\\\\":\\\\\\"\\\\\\",\\\\\\"text\\\\\\":\\\\\\"T\\\\\\",\\\\\\"type\\\\\\":\\\\\\"extended-text\\\\\\",\\\\\\"version\\\\\\":1}],\\\\\\"direction\\\\\\":\\\\\\"ltr\\\\\\",\\\\\\"format\\\\\\":\\\\\\"\\\\\\",\\\\\\"indent\\\\\\":0,\\\\\\"type\\\\\\":\\\\\\"paragraph\\\\\\",\\\\\\"version\\\\\\":1}],\\\\\\"direction\\\\\\":\\\\\\"ltr\\\\\\",\\\\\\"format\\\\\\":\\\\\\"\\\\\\",\\\\\\"indent\\\\\\":0,\\\\\\"type\\\\\\":\\\\\\"root\\\\\\",\\\\\\"version\\\\\\":1}}\\"","type":"extended-text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}'});
        
        // restore the post
        const post = await this.service.restore(key);

        expect(post.get('lexical')).to.equal('test lexical string');
    });
});
