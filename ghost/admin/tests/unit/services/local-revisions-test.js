import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupTest} from 'ember-mocha';

const sleep = ms => new Promise((resolve) => {
    setTimeout(resolve, ms);
});

function createPost(data) {
    return {
        id: data.id ?? undefined,
        get: attribute => data[attribute]
    };
}

describe('Unit: Service: local-revisions', function () {
    setupTest();

    this.beforeEach(function () {
        this.service = this.owner.lookup('service:local-revisions');
        this.service.clear();
    });

    it('exists', function () {
        expect(this.service).to.be.ok;
    });

    describe('generateKey', function () {
        it('generates a key for a post with an id', function () {
            const key = this.service.generateKey(createPost({id: 'test'}));
            expect(key).to.match(/post-revision-test-\d+/);
        });
        
        it('generates a key for a post without a post id', function () {
            const key = this.service.generateKey(createPost({id: 'draft'}));
            expect(key).to.match(/post-revision-draft-\d+/);
        });
    });

    describe('save', function () {
        it('saves a revision without a post id', function () {
            // save a revision
            this.service.save(createPost({id: 'draft', lexical: 'test'}));
            // grab the key of the saved revision
            const revisions = this.service.getAll();
            const key = Object.keys(revisions)[0];
            expect(key).to.match(/post-revision-draft-\d+/);
            expect(this.service.get(key)).to.deep.equal({id: 'draft', lexical: 'test'});
        });

        it('saves a revision with a post id', function () {
            // save a revision
            this.service.save(createPost({id: 'test-id', lexical: 'test'}));
            // grab the key of the saved revision
            const revisions = this.service.getAll();
            const key = Object.keys(revisions)[0];
            expect(key).to.match(/post-revision-test-id-\d+/);
            expect(this.service.get(key)).to.deep.equal({id: 'test-id', lexical: 'test'});
        });
    });

    describe('get', function () {
        it('gets a revision by key', function () {
            // save a revision
            this.service.save(createPost({lexical: 'test'}));
            // grab the key of the saved revision
            const revisions = this.service.getAll();
            const key = Object.keys(revisions)[0];
            const result = this.service.get(key);
            expect(result).to.deep.equal({
                id: 'draft',
                lexical: 'test'
            });
        });
    });

    describe('getAll', function () {
        it('gets all revisions if no prefix is provided', function () {
            // save a revision
            this.service.save(createPost({id: 'test-id', lexical: 'test'}));
            this.service.save(createPost({lexical: 'data-2'}));
            const result = this.service.getAll();
            expect(Object.keys(result)).to.have.lengthOf(2);
        });
    });

    describe('getByPostId', function () {
        it('gets all revisions for a post id', async function () {
            // save a revision
            this.service.save(createPost({id: 'test-id', lexical: 'test'}));
            this.service.save(createPost({lexical: 'data-2'}));
            await sleep(2);
            this.service.save(createPost({id: 'test-id', lexical: 'data-3'}));
            const result = this.service.getByPostId('test-id');
            expect(Object.keys(result)).to.have.lengthOf(2);
        });

        it('gets all revisions without an id if no id is provided', async function () {
            // save a revision
            this.service.save(createPost({id: 'test-id', lexical: 'data'}));
            this.service.save(createPost({lexical: 'data-2'}));
            await sleep(1);
            this.service.save(createPost({lexical: 'data-3'}));
            const result = this.service.getByPostId();
            expect(Object.keys(result)).to.have.lengthOf(2);
        });
    });

    describe('keys', function () {
        it('returns the keys for all revisions', function () {
            // save revision
            this.service.save(createPost({id: 'test-id', lexical: 'data'}));
            const result = this.service.keys();
            expect(Object.keys(result)).to.have.lengthOf(1);
            expect(result[0]).to.match(/post-revision-test-id-\d+/);
        });
    });

    describe('remove', function () {
        it('removes the specified key', function () {
            // save revision
            this.service.save(createPost({id: 'test-id', lexical: 'data'}));
            this.service.save(createPost({id: 'test-2', lexical: 'data'}));
            const keys = this.service.keys();
            const keyToRemove = keys[0];
            this.service.remove(keyToRemove);
            const updatedKeys = this.service.keys();
            expect(updatedKeys).to.have.lengthOf(1);
            expect(this.service.get(keyToRemove)).to.be.null;
        });
    });
});
